import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getSolPrice, usdToSol } from '@/lib/solana';

// Get deposit info (wallet address, SOL price, etc.)
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const settings = await prisma.settings.findUnique({
      where: { id: 'settings' },
    });

    if (!settings?.solanaWallet) {
      return NextResponse.json(
        { error: 'Deposit wallet not configured. Please contact support.' },
        { status: 503 }
      );
    }

    // Get current SOL price
    const solPrice = await getSolPrice();
    const minDepositUsd = settings.minDeposit || 10;
    const minDepositSol = await usdToSol(minDepositUsd);

    // Get user's pending/recent deposits
    const deposits = await prisma.deposit.findMany({
      where: {
        userId: user.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      wallet: settings.solanaWallet,
      solPrice: Number(solPrice.toFixed(2)),
      minDepositUsd,
      minDepositSol: Number(minDepositSol.toFixed(6)),
      deposits,
      // Generate Solana Pay URL for easy scanning
      solanaPayUrl: `solana:${settings.solanaWallet}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get deposit info';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
