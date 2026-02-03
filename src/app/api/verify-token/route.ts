import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getSolPrice, DEPOSIT_WALLET_ADDRESS, CARD_TOKEN_REQUIREMENT } from '@/lib/solana';

/**
 * POST /api/verify-token
 * Create a token verification payment order
 * User must send $5 SOL with the provided memo to verify token ownership
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // Check if user already has a pending verification
    const existingVerification = await prisma.paymentOrder.findFirst({
      where: {
        userId: user.id,
        isTokenVerification: true,
        status: { in: ['pending', 'paid'] },
      },
    });

    if (existingVerification) {
      return NextResponse.json(
        { 
          error: 'You already have a pending token verification. Please complete it or wait for it to expire (30 minutes).',
          existingOrderId: existingVerification.id,
        },
        { status: 400 }
      );
    }

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
          error: 'You already have an active card. You can only have one card at a time.' 
        },
        { status: 400 }
      );
    }

    // Create unique verification memo
    const verificationMemo = `verify_${user.id}_${Date.now()}`;
    const verificationAmount = 5; // $5 verification fee (card creation fee)

    // Get current SOL price
    let solPrice;
    try {
      solPrice = await getSolPrice();
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

    const amountSol = verificationAmount / solPrice;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Create verification payment order
    const verificationOrder = await prisma.paymentOrder.create({
      data: {
        userId: user.id,
        type: 'token_verification',
        isTokenVerification: true,
        verificationMemo,
        amountUsd: verificationAmount,
        amountSol,
        solPrice,
        status: 'pending',
        expectedWallet: DEPOSIT_WALLET_ADDRESS,
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: verificationOrder.id,
      verification: {
        memo: verificationMemo,
        walletAddress: DEPOSIT_WALLET_ADDRESS,
        amountSol: amountSol.toFixed(6),
        amountUsd: verificationAmount.toFixed(2),
        solPrice: solPrice.toFixed(2),
        instructions: `Send ${amountSol.toFixed(6)} SOL from your wallet that holds ${CARD_TOKEN_REQUIREMENT} tokens to ${DEPOSIT_WALLET_ADDRESS} with memo: ${verificationMemo}`,
        expiresAt: expiresAt.toISOString(),
        expiresIn: '30 minutes',
      },
      message: `Please send ${amountSol.toFixed(6)} SOL ($5 card creation fee) to verify token ownership and create your card. This will take 1-2 minutes to confirm.`,
    });
  } catch (error) {
    console.error('Token verification error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create verification order';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/verify-token?orderId=...
 * Check verification status
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const order = await prisma.paymentOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      orderId: order.id,
      status: order.status,
      tokenVerified: order.tokenVerified,
      senderAddress: order.senderAddress,
      createdAt: order.createdAt,
      expiresAt: order.expiresAt,
      message: 
        order.status === 'completed' && order.tokenVerified 
          ? '✅ Token verification successful! You can now create a card.'
          : order.status === 'pending'
          ? '⏳ Waiting for payment confirmation...'
          : order.status === 'expired'
          ? '❌ Verification expired. Please try again.'
          : '❌ Verification failed. Please check your wallet and try again.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to check verification status';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
