import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getSolPrice, usdToSol, getRecentTransactions, solToUsd } from '@/lib/solana';

// Create a deposit intent / Check for deposits from user's wallet
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { walletAddress, amountUsd } = body;

    const settings = await prisma.settings.findUnique({
      where: { id: 'settings' },
    });

    if (!settings?.solanaWallet) {
      return NextResponse.json(
        { error: 'Deposits are not available at this time' },
        { status: 503 }
      );
    }

    const minDeposit = settings.minDeposit || 10;

    if (amountUsd && amountUsd < minDeposit) {
      return NextResponse.json(
        { error: `Minimum deposit is $${minDeposit}` },
        { status: 400 }
      );
    }

    const solPrice = await getSolPrice();

    // If user provided their wallet address, check for incoming transactions
    if (walletAddress) {
      // Get transactions to our deposit wallet
      const transactions = await getRecentTransactions(settings.solanaWallet, 30);
      
      // Find transactions from the user's wallet that aren't yet recorded
      for (const tx of transactions) {
        if (tx.from.toLowerCase() === walletAddress.toLowerCase()) {
          // Check if already recorded
          const existing = await prisma.deposit.findUnique({
            where: { txSignature: tx.signature },
          });

          if (!existing) {
            const usdAmount = await solToUsd(tx.amount);
            
            if (usdAmount >= minDeposit) {
              // Create and confirm the deposit
              await prisma.deposit.create({
                data: {
                  userId: user.id,
                  amountSol: tx.amount,
                  amountUsd: usdAmount,
                  solPrice: solPrice,
                  status: 'confirmed',
                  txSignature: tx.signature,
                  fromWallet: tx.from,
                  detectedAt: new Date(),
                  confirmedAt: new Date(),
                },
              });

              // Credit user's balance
              await prisma.user.update({
                where: { id: user.id },
                data: { balance: { increment: usdAmount } },
              });

              // Record transaction
              await prisma.transaction.create({
                data: {
                  userId: user.id,
                  type: 'deposit',
                  amount: usdAmount,
                  currency: 'USD',
                  status: 'completed',
                  description: `SOL deposit: ${tx.amount.toFixed(6)} SOL @ $${solPrice.toFixed(2)}`,
                  reference: tx.signature,
                },
              });

              // Get updated user
              const updatedUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { balance: true },
              });

              return NextResponse.json({
                success: true,
                message: 'Deposit confirmed!',
                deposit: {
                  amountSol: tx.amount,
                  amountUsd: usdAmount,
                  txSignature: tx.signature,
                },
                newBalance: updatedUser?.balance,
              });
            }
          }
        }
      }

      return NextResponse.json({
        success: false,
        message: 'No new deposits found from your wallet. Make sure you sent SOL to the correct address.',
        wallet: settings.solanaWallet,
      });
    }

    // Return deposit instructions
    const amountSol = amountUsd ? await usdToSol(amountUsd) : null;

    return NextResponse.json({
      depositWallet: settings.solanaWallet,
      solPrice: Number(solPrice.toFixed(2)),
      minDepositUsd: minDeposit,
      minDepositSol: Number((await usdToSol(minDeposit)).toFixed(6)),
      requestedAmount: amountUsd ? {
        usd: amountUsd,
        sol: Number(amountSol!.toFixed(6)),
      } : null,
      instructions: [
        `Send SOL to: ${settings.solanaWallet}`,
        'After sending, come back and click "Check Payment" with your wallet address',
        'Your balance will be credited automatically',
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process deposit';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - Get user's deposit history
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const deposits = await prisma.deposit.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json(deposits);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch deposits';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
