import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import zeroidApi from '@/lib/api/zeroid';

// Get user's cards
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const cards = await prisma.card.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch additional details from ZeroID for each card (last_four, status)
    const cardsWithDetails = await Promise.all(
      cards.map(async (card) => {
        try {
          if (card.zeroidCardId) {
            const zeroidCard = await zeroidApi.getCard(card.zeroidCardId);
            console.log(`[Cards] ZeroID response for ${card.zeroidCardId}:`, zeroidCard);
            return {
              ...card,
              last_four: zeroidCard.last_four || card.lastFour,
              status: zeroidCard.status || card.status,
              // Get balance from ZeroID - this is the live balance
              balance: zeroidCard.balance !== undefined ? zeroidCard.balance : card.balance,
            };
          }
        } catch (error) {
          console.error(`Failed to fetch ZeroID card ${card.zeroidCardId}:`, error);
          // Return card with stored data if ZeroID fetch fails
        }
        return card;
      })
    );

    return NextResponse.json({ cards: cardsWithDetails });
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
