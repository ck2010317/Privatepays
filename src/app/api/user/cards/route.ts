import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Get user's cards
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const cards = await prisma.card.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ cards });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch cards';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Request a new card
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { title, amount } = body;

    if (!title || !amount) {
      return NextResponse.json(
        { error: 'Title and initial amount are required' },
        { status: 400 }
      );
    }

    // Get settings for minimum amount
    const settings = await prisma.settings.findUnique({
      where: { id: 'settings' },
    });

    const minAmount = settings?.minTopUp || 10;
    const fee = settings?.cardCreationFee || 5;
    const totalRequired = amount + fee; // Flat fee for card creation

    if (amount < minAmount) {
      return NextResponse.json(
        { error: `Minimum card balance is $${minAmount}` },
        { status: 400 }
      );
    }

    // Check user balance
    if (user.balance < totalRequired) {
      return NextResponse.json(
        { error: `Insufficient balance. You need $${totalRequired.toFixed(2)} ($${amount} + $${fee} card creation fee). Your balance: $${user.balance.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Create card request
    const cardRequest = await prisma.cardRequest.create({
      data: {
        userId: user.id,
        title,
        amount,
        currency: 'USD',
        status: 'pending',
      },
    });

    // Deduct balance (will be refunded if rejected)
    await prisma.user.update({
      where: { id: user.id },
      data: { balance: { decrement: totalRequired } },
    });

    // Create transaction record
    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'card_creation',
        amount: -totalRequired,
        currency: 'USD',
        status: 'pending',
        description: `Card request: ${title}`,
        reference: cardRequest.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Card request submitted. Awaiting admin approval.',
      requestId: cardRequest.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to request card';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
