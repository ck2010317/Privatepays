import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import zeroidApi from '@/lib/api/zeroid';

// Approve or reject card request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    const { requestId } = await params;
    const body = await request.json();
    const { action, note, zeroidCardId } = body; // action: 'approve' or 'reject'

    const cardRequest = await prisma.cardRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!cardRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (cardRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Request already processed' },
        { status: 400 }
      );
    }

    const settings = await prisma.settings.findUnique({
      where: { id: 'settings' },
    });
    const fee = settings?.cardCreationFee || 5;
    const totalDeducted = cardRequest.amount * (1 + fee / 100);

    if (action === 'approve') {
      // Admin needs to provide the ZeroID card ID after creating it manually
      // Or we can try to create it via API
      
      let finalZeroidCardId = zeroidCardId;
      
      // Try to create card via ZeroID API if no ID provided
      if (!finalZeroidCardId) {
        try {
          const result = await zeroidApi.createCard({
            title: cardRequest.title,
            email: cardRequest.user.email,
            phone_number: cardRequest.user.phone || '+10000000000',
            card_commission_id: '5',
            currency_id: 'usdt', // Use your available currency
          });
          finalZeroidCardId = result.card_id;
        } catch (apiError) {
          console.error('ZeroID API error:', apiError);
          return NextResponse.json(
            { error: `Failed to create card via ZeroID: ${apiError instanceof Error ? apiError.message : 'Unknown error'}. Please create manually and provide the card ID.` },
            { status: 400 }
          );
        }
      }

      // Create the card in our database
      const card = await prisma.card.create({
        data: {
          userId: cardRequest.userId,
          zeroidCardId: finalZeroidCardId,
          title: cardRequest.title,
          status: 'active',
          balance: cardRequest.amount,
          currency: cardRequest.currency,
        },
      });

      // Update request
      await prisma.cardRequest.update({
        where: { id: requestId },
        data: {
          status: 'completed',
          cardId: card.id,
          adminNote: note,
        },
      });

      // Update transaction
      await prisma.transaction.updateMany({
        where: {
          reference: requestId,
          type: 'card_creation',
        },
        data: {
          status: 'completed',
          cardId: card.id,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Card request approved',
        card,
      });
    } else if (action === 'reject') {
      // Refund user
      await prisma.user.update({
        where: { id: cardRequest.userId },
        data: { balance: { increment: totalDeducted } },
      });

      // Update request
      await prisma.cardRequest.update({
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
          type: 'card_creation',
        },
        data: { status: 'failed' },
      });

      // Create refund transaction
      await prisma.transaction.create({
        data: {
          userId: cardRequest.userId,
          type: 'card_creation',
          amount: totalDeducted,
          currency: 'USD',
          status: 'completed',
          description: `Refund: Card request rejected - ${note || 'No reason provided'}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Card request rejected and amount refunded',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Process card request error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process request';
    if (message === 'Unauthorized' || message === 'Admin access required') {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
