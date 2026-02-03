import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { checkTokenBalance } from '@/lib/solana';

/**
 * DEBUG ENDPOINT - Complete verification manually
 * POST /api/verify-token-debug with wallet address to complete verification
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'walletAddress is required' },
        { status: 400 }
      );
    }

    console.log(`Manual verification attempt for user ${user.id} with wallet ${walletAddress}`);

    // Get the user's pending verification
    const pendingVerification = await prisma.paymentOrder.findFirst({
      where: {
        userId: user.id,
        isTokenVerification: true,
        status: { in: ['pending', 'paid'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!pendingVerification) {
      return NextResponse.json(
        { error: 'No pending verification found. Please start a new verification first.' },
        { status: 404 }
      );
    }

    // Check token balance for the provided wallet
    console.log(`Checking token balance for ${walletAddress}...`);
    const tokenCheck = await checkTokenBalance(walletAddress);
    console.log(`Token check result:`, tokenCheck);

    if (tokenCheck.hasRequiredTokens) {
      // Update to verified
      const updated = await prisma.paymentOrder.update({
        where: { id: pendingVerification.id },
        data: {
          status: 'completed',
          tokenVerified: true,
          senderAddress: walletAddress,
        },
      });

      console.log(`✅ Verification COMPLETED for user ${user.id}`);

      return NextResponse.json({
        success: true,
        message: `✅ Token verification COMPLETED! You now have ${tokenCheck.balance} tokens. You can create your card!`,
        verification: {
          id: updated.id,
          status: 'completed',
          tokenVerified: true,
          senderAddress: walletAddress,
          balance: tokenCheck.balance,
          required: tokenCheck.required,
        },
      });
    } else {
      console.log(`❌ Token check FAILED for ${walletAddress}: ${tokenCheck.balance} < ${tokenCheck.required}`);
      
      return NextResponse.json({
        success: false,
        message: `❌ Token check FAILED. You have ${tokenCheck.balance} tokens but need ${tokenCheck.required} tokens to create a card.`,
        verification: {
          id: pendingVerification.id,
          balance: tokenCheck.balance,
          required: tokenCheck.required,
          hasTokens: tokenCheck.hasRequiredTokens,
        },
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Debug verification error:', error);
    const message = error instanceof Error ? error.message : 'Failed to verify';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
