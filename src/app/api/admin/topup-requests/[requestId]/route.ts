import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import zeroidApi from '@/lib/api/zeroid';

// Approve or reject top-up request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    await requireAdmin(request);
    const { requestId } = await params;
    const body = await request.json();
    const { action, note } = body;

    const topUpRequest = await prisma.topUpRequest.findUnique({
      where: { id: requestId },
      include: {
        card: {
          include: { user: true },
        },
      },
    });

    if (!topUpRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (topUpRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Request already processed' },
        { status: 400 }
      );
    }

    const settings = await prisma.settings.findUnique({
      where: { id: 'settings' },
    });
    const feePercent = settings?.topUpFeePercent || 2.5;
    const feeFlat = settings?.topUpFeeFlat || 2;
    const fee = (topUpRequest.amount * (feePercent / 100)) + feeFlat;
    const totalDeducted = topUpRequest.amount + fee;

    if (action === 'approve') {
      // Try to top up via ZeroID API
      let finalAmount = topUpRequest.amount;
      let zeroidRefId = null;

      if (topUpRequest.card.zeroidCardId) {
        try {
          const result = await zeroidApi.topUpCard(topUpRequest.card.zeroidCardId, {
            amount: topUpRequest.amount,
            currency_id: 'usdc', // Use USDC
          });
          finalAmount = result.final_amount;
          zeroidRefId = result.reference_id;
        } catch (apiError) {
          console.error('ZeroID API error:', apiError);
          return NextResponse.json(
            { error: `Failed to top up via ZeroID: ${apiError instanceof Error ? apiError.message : 'Unknown error'}` },
            { status: 400 }
          );
        }
      }

      // Update card balance
      await prisma.card.update({
        where: { id: topUpRequest.cardId },
        data: { balance: { increment: finalAmount } },
      });

      // Update request
      await prisma.topUpRequest.update({
        where: { id: requestId },
        data: {
          status: 'completed',
          zeroidRefId,
          finalAmount,
          adminNote: note,
        },
      });

      // Update transaction
      await prisma.transaction.updateMany({
        where: {
          reference: requestId,
          type: 'card_topup',
        },
        data: { status: 'completed' },
      });

      return NextResponse.json({
        success: true,
        message: `Top-up approved. $${finalAmount.toFixed(2)} added to card.`,
      });
    } else if (action === 'reject') {
      // Refund user
      await prisma.user.update({
        where: { id: topUpRequest.card.userId },
        data: { balance: { increment: totalDeducted } },
      });

      // Update request
      await prisma.topUpRequest.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          adminNote: note,
        },
      });

      // Update transaction
      await prisma.transaction.updateMany({
        where: {
          reference: requestId,
          type: 'card_topup',
        },
        data: { status: 'failed' },
      });

      // Create refund transaction
      await prisma.transaction.create({
        data: {
          userId: topUpRequest.card.userId,
          cardId: topUpRequest.cardId,
          type: 'card_topup',
          amount: totalDeducted,
          currency: 'USD',
          status: 'completed',
          description: `Refund: Top-up rejected - ${note || 'No reason provided'}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Top-up rejected and amount refunded',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Process top-up request error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process request';
    if (message === 'Unauthorized' || message === 'Admin access required') {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
