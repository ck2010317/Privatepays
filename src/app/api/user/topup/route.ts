import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, getUserFromRequest } from '@/lib/auth';

// Create a new top-up request
export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { cardId, amount } = body;

    if (!cardId || !amount || amount < 10) {
      return NextResponse.json(
        { error: 'Card ID and amount (minimum $10) are required' },
        { status: 400 }
      );
    }

    // Check if card exists and belongs to user
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
        { error: 'Card must be active to request top-up' },
        { status: 400 }
      );
    }

    // Get settings for fee calculation
    const settings = await prisma.settings.findUnique({
      where: { id: 'settings' },
    });

    const feePercent = settings?.topUpFeePercent || 2.5;
    const feeFlat = settings?.topUpFeeFlat || 2;
    const fee = (amount * (feePercent / 100)) + feeFlat;
    const totalRequired = amount + fee;

    // Check if user has enough balance
    if (user.balance < totalRequired) {
      return NextResponse.json(
        { error: `Insufficient balance. You need $${totalRequired.toFixed(2)} (amount + ${feePercent}% + $${feeFlat} fee) but only have $${user.balance.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Create top-up request
    const topUpRequest = await prisma.topUpRequest.create({
      data: {
        cardId: card.id,
        amount: amount,
        currency: 'USD',
        status: 'pending',
      },
    });

    return NextResponse.json(topUpRequest, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create top-up request';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Get user's top-up requests
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const topUpRequests = await prisma.topUpRequest.findMany({
      where: {
        card: {
          userId: user.id,
        },
      },
      include: {
        card: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(topUpRequests);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch top-up requests';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
