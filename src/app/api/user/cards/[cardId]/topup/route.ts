import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Request top-up for a card
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { cardId } = await params;
    const body = await request.json();
    const { amount } = body;

    // Find user's card
    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        userId: user.id,
      },
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    if (card.status !== 'active') {
      return NextResponse.json(
        { error: 'Card is not active. Cannot top up.' },
        { status: 400 }
      );
    }

    // Get settings
    const settings = await prisma.settings.findUnique({
      where: { id: 'settings' },
    });

    const minTopUp = settings?.minTopUp || 5;
    const fee = settings?.topUpFeePercent || 2.5;
    const totalRequired = amount * (1 + fee / 100);

    if (amount < minTopUp) {
      return NextResponse.json(
        { error: `Minimum top-up is $${minTopUp}` },
        { status: 400 }
      );
    }

    // Check user balance
    if (user.balance < totalRequired) {
      return NextResponse.json(
        { error: `Insufficient balance. You need $${totalRequired.toFixed(2)} (including ${fee}% fee). Your balance: $${user.balance.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Create top-up request
    const topUpRequest = await prisma.topUpRequest.create({
      data: {
        cardId: card.id,
        amount,
        currency: 'USD',
        status: 'pending',
      },
    });

    // Deduct balance
    await prisma.user.update({
      where: { id: user.id },
      data: { balance: { decrement: totalRequired } },
    });

    // Create transaction record
    await prisma.transaction.create({
      data: {
        userId: user.id,
        cardId: card.id,
        type: 'card_topup',
        amount: -totalRequired,
        currency: 'USD',
        status: 'pending',
        description: `Top-up request for ${card.title}`,
        reference: topUpRequest.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Top-up request submitted. Awaiting admin approval.',
      requestId: topUpRequest.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to request top-up';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
