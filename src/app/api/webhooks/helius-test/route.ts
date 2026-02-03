import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { checkTokenBalance } from '@/lib/solana';

/**
 * TEST ENDPOINT - Manually test webhook logic without auth
 * POST /api/webhooks/helius-test
 * 
 * Body example:
 * {
 *   "signature": "5gq...",
 *   "senderAddress": "mfSRUpBhETq9PwZ2dZnGxHVMVwTRm2GmHiokApMynJ7",
 *   "amountSol": 0.049935,
 *   "amountUsd": 5.00
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signature, senderAddress, amountSol, amountUsd } = body;

    if (!signature || !senderAddress || !amountSol) {
      return NextResponse.json(
        { error: 'Missing required fields: signature, senderAddress, amountSol' },
        { status: 400 }
      );
    }

    console.log(`TEST: Processing webhook manually`);
    console.log(`Signature: ${signature}`);
    console.log(`Sender: ${senderAddress}`);
    console.log(`Amount: ${amountSol} SOL (≈ $${amountUsd})`);

    const mainWallet = '6aGvR36EkR4wB57xN8JvMAR3nikzYoYwxbBKJTJYD3jy';

    // Check if this is a token verification payment (must be at least ~0.02 SOL = roughly $5)
    const isVerification = amountSol >= 0.02;
    console.log(`Is verification payment? ${isVerification} (amount: ${amountSol} SOL)`);

    if (!isVerification) {
      return NextResponse.json({
        error: `Amount ${amountSol} SOL is less than minimum 0.02 SOL required for verification`,
      }, { status: 400 });
    }

    // Try to find matching verification order
    const verificationOrder = await prisma.paymentOrder.findFirst({
      where: {
        status: 'pending',
        isTokenVerification: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verificationOrder) {
      return NextResponse.json({
        error: 'No pending verification order found in database',
      }, { status: 404 });
    }

    console.log(`Found verification order: ${verificationOrder.id}`);

    // Check if sender's wallet has required tokens
    console.log(`Checking token balance for ${senderAddress}...`);
    const tokenCheck = await checkTokenBalance(senderAddress);
    console.log(`Token check result:`, tokenCheck);

    const verified = tokenCheck.hasRequiredTokens;

    // Update verification order
    const updated = await prisma.paymentOrder.update({
      where: { id: verificationOrder.id },
      data: {
        status: verified ? 'completed' : 'failed',
        txSignature: signature,
        senderAddress: senderAddress,
        tokenVerified: verified,
        paidAmount: amountSol,
        paidAt: new Date(),
      },
    });

    console.log(`Token verification ${verified ? 'PASSED' : 'FAILED'} for order ${verificationOrder.id}`);

    return NextResponse.json({
      success: true,
      message: verified ? '✅ Verification COMPLETED!' : '❌ Verification FAILED - insufficient tokens',
      order: {
        id: updated.id,
        status: updated.status,
        tokenVerified: updated.tokenVerified,
        senderAddress: updated.senderAddress,
      },
      tokenCheck: {
        hasTokens: tokenCheck.hasRequiredTokens,
        balance: tokenCheck.balance,
        required: tokenCheck.required,
      },
    });
  } catch (error) {
    console.error('TEST webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET - Return diagnostic info about pending verifications
 */
export async function GET() {
  try {
    const pendingVerifications = await prisma.paymentOrder.findMany({
      where: {
        isTokenVerification: true,
        status: { in: ['pending', 'paid'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      pendingVerifications: pendingVerifications.map(v => ({
        id: v.id,
        userId: v.userId,
        status: v.status,
        amountSol: v.amountSol,
        amountUsd: v.amountUsd,
        createdAt: v.createdAt,
        expiresAt: v.expiresAt,
      })),
      count: pendingVerifications.length,
    });
  } catch (error) {
    console.error('GET diagnostic error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch' },
      { status: 500 }
    );
  }
}
