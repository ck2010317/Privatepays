import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getSolPrice, DEPOSIT_WALLET_ADDRESS } from '@/lib/solana';

// Create a new payment order for card creation or top-up
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { type, cardTitle, email, phoneNumber, topUpAmount, cardId } = body;

    // Get settings or create defaults
    let settings = await prisma.settings.findUnique({
      where: { id: 'settings' },
    });

    if (!settings) {
      // Create default settings
      settings = await prisma.settings.create({
        data: {
          id: 'settings',
          cardCreationFee: 40,
          topUpFeePercent: 2.5,
          topUpFeeFlat: 2,
          minTopUp: 10,
          maxTopUp: 5000,
          minDeposit: 10,
          solanaWallet: DEPOSIT_WALLET_ADDRESS || null,
        },
      });
    }

    const cardCreationFee = settings.cardCreationFee || 40;
    const topUpFeePercent = settings.topUpFeePercent || 2.5;
    const topUpFeeFlat = settings.topUpFeeFlat || 2;
    const minTopUp = settings.minTopUp || 10;
    const depositWallet = DEPOSIT_WALLET_ADDRESS; // Always use the hardcoded wallet

    let totalUsd = 0;
    let cardFee = 0;
    let topUpFee = 0;
    let finalTopUpAmount = 0;

    if (type === 'card_creation') {
      // Check if user already has an active card
      const existingCard = await prisma.card.findFirst({
        where: {
          userId: user.id,
          status: { in: ['active', 'processing', 'pending'] },
        },
      });

      if (existingCard) {
        return NextResponse.json(
          { 
            error: 'You already have an active card. You can only have one card at a time. Use the top-up feature to add funds to your existing card.' 
          },
          { status: 400 }
        );
      }

      // NEW UNIFIED FLOW: Card creation with integrated token verification
      // User pays $30 card fee + optional top-up in ONE payment
      // Token verification happens during payment processing
      
      const cardCreationFee = 30; // Fixed $30 card creation fee
      finalTopUpAmount = topUpAmount || 15; // Default $15 initial top-up
      
      if (finalTopUpAmount < minTopUp) {
        return NextResponse.json(
          { error: `Minimum top-up amount is $${minTopUp}` },
          { status: 400 }
        );
      }

      topUpFee = (finalTopUpAmount * topUpFeePercent / 100) + topUpFeeFlat;
      totalUsd = cardCreationFee + finalTopUpAmount + topUpFee;

    } else if (type === 'card_topup') {
      if (!cardId || !topUpAmount) {
        return NextResponse.json(
          { error: 'Card ID and top-up amount are required' },
          { status: 400 }
        );
      }

      // Verify card exists and belongs to user
      const card = await prisma.card.findFirst({
        where: { id: cardId, userId: user.id },
      });

      if (!card) {
        return NextResponse.json({ error: 'Card not found' }, { status: 404 });
      }

      if (card.status !== 'active') {
        return NextResponse.json(
          { error: 'Card must be active to top up' },
          { status: 400 }
        );
      }

      finalTopUpAmount = topUpAmount;

      if (finalTopUpAmount < minTopUp) {
        return NextResponse.json(
          { error: `Minimum top-up amount is $${minTopUp}` },
          { status: 400 }
        );
      }

      topUpFee = (finalTopUpAmount * topUpFeePercent / 100) + topUpFeeFlat;
      totalUsd = finalTopUpAmount + topUpFee;

    } else {
      return NextResponse.json(
        { error: 'Invalid order type. Use "card_creation" or "card_topup"' },
        { status: 400 }
      );
    }

    // Get current SOL price
    let solPrice;
    try {
      solPrice = await getSolPrice();
      console.log('SOL Price fetched:', solPrice);
    } catch (priceError) {
      console.error('Error fetching SOL price:', priceError);
      return NextResponse.json(
        { error: 'Could not fetch SOL price. Please try again.' },
        { status: 500 }
      );
    }
    
    if (!solPrice || solPrice <= 0) {
      return NextResponse.json(
        { error: 'Could not fetch SOL price. Please try again.' },
        { status: 500 }
      );
    }

    const amountSol = totalUsd / solPrice;

    // Create payment order with 30-minute expiry
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const paymentOrder = await prisma.paymentOrder.create({
      data: {
        userId: user.id,
        type,
        amountUsd: totalUsd,
        amountSol,
        solPrice,
        cardTitle: type === 'card_creation' ? cardTitle : null,
        email: type === 'card_creation' ? email : null,
        phoneNumber: type === 'card_creation' ? phoneNumber : null,
        topUpAmount: finalTopUpAmount,
        cardId: type === 'card_topup' ? cardId : null,
        cardFee,
        topUpFee,
        status: 'pending',
        expectedWallet: depositWallet,
        expiresAt,
      },
    });

    return NextResponse.json({
      order: paymentOrder,
      payment: {
        walletAddress: depositWallet,
        amountSol: amountSol.toFixed(6),
        amountUsd: totalUsd.toFixed(2),
        solPrice: solPrice.toFixed(2),
        expiresAt: expiresAt.toISOString(),
        breakdown: {
          cardFee: cardFee.toFixed(2),
          topUpAmount: finalTopUpAmount.toFixed(2),
          topUpFee: topUpFee.toFixed(2),
          total: totalUsd.toFixed(2),
        },
      },
    });
  } catch (error) {
    console.error('Create payment order error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create payment order';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Get user's payment orders
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const orders = await prisma.paymentOrder.findMany({
      where: {
        userId: user.id,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ orders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch orders';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
