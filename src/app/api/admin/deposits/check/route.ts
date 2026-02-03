import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { getRecentTransactions, solToUsd, getSolPrice } from '@/lib/solana';

// Check for new deposits from Solana blockchain
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const settings = await prisma.settings.findUnique({
      where: { id: 'settings' },
    });

    if (!settings?.solanaWallet) {
      return NextResponse.json(
        { error: 'Solana wallet not configured' },
        { status: 400 }
      );
    }

    // Get recent transactions to our wallet
    const transactions = await getRecentTransactions(settings.solanaWallet, 50);
    const solPrice = await getSolPrice();

    let newDeposits = 0;
    let updatedDeposits = 0;

    for (const tx of transactions) {
      // Check if this transaction is already recorded
      const existingDeposit = await prisma.deposit.findUnique({
        where: { txSignature: tx.signature },
      });

      if (existingDeposit) {
        // Update status if needed
        if (existingDeposit.status === 'pending' && tx.status === 'finalized') {
          await prisma.deposit.update({
            where: { id: existingDeposit.id },
            data: { 
              status: 'confirmed',
              confirmedAt: new Date(),
            },
          });

          // Credit user's balance
          const usdAmount = existingDeposit.amountUsd;
          await prisma.user.update({
            where: { id: existingDeposit.userId },
            data: { balance: { increment: usdAmount } },
          });

          // Record transaction
          await prisma.transaction.create({
            data: {
              userId: existingDeposit.userId,
              type: 'deposit',
              amount: usdAmount,
              currency: 'USD',
              status: 'completed',
              description: `SOL deposit: ${existingDeposit.amountSol} SOL @ $${existingDeposit.solPrice}`,
              reference: tx.signature,
            },
          });

          updatedDeposits++;
        }
        continue;
      }

      // This is a new transaction - try to match it to a user
      // For now, we'll create an unassigned deposit that admin can review
      // In production, you might want users to include a memo with their user ID
      
      const usdAmount = await solToUsd(tx.amount);

      // Check minimum deposit
      const minDeposit = settings.minDeposit || 10;
      if (usdAmount < minDeposit) {
        console.log(`Skipping small deposit: ${tx.amount} SOL ($${usdAmount.toFixed(2)})`);
        continue;
      }

      // Try to find user by their wallet address (if they've deposited before)
      const previousDeposit = await prisma.deposit.findFirst({
        where: { fromWallet: tx.from },
        orderBy: { createdAt: 'desc' },
      });

      if (previousDeposit) {
        // Auto-assign to the same user
        const deposit = await prisma.deposit.create({
          data: {
            userId: previousDeposit.userId,
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
          where: { id: previousDeposit.userId },
          data: { balance: { increment: usdAmount } },
        });

        // Record transaction
        await prisma.transaction.create({
          data: {
            userId: previousDeposit.userId,
            type: 'deposit',
            amount: usdAmount,
            currency: 'USD',
            status: 'completed',
            description: `SOL deposit: ${tx.amount} SOL @ $${solPrice.toFixed(2)}`,
            reference: tx.signature,
          },
        });

        newDeposits++;
      }
      // If no previous deposit from this wallet, skip for now
      // Admin will need to manually assign or user needs to link wallet
    }

    return NextResponse.json({
      success: true,
      newDeposits,
      updatedDeposits,
      totalTransactionsChecked: transactions.length,
    });
  } catch (error) {
    console.error('Error checking deposits:', error);
    const message = error instanceof Error ? error.message : 'Failed to check deposits';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - Get all detected transactions (for admin review)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const settings = await prisma.settings.findUnique({
      where: { id: 'settings' },
    });

    if (!settings?.solanaWallet) {
      return NextResponse.json(
        { error: 'Solana wallet not configured' },
        { status: 400 }
      );
    }

    // Get recent transactions
    const transactions = await getRecentTransactions(settings.solanaWallet, 20);
    const solPrice = await getSolPrice();

    // Enrich with deposit info
    const enrichedTransactions = await Promise.all(
      transactions.map(async (tx) => {
        const deposit = await prisma.deposit.findUnique({
          where: { txSignature: tx.signature },
          include: { user: { select: { id: true, email: true, name: true } } },
        });

        return {
          ...tx,
          usdAmount: await solToUsd(tx.amount),
          deposit,
          isRecorded: !!deposit,
        };
      })
    );

    return NextResponse.json({
      transactions: enrichedTransactions,
      solPrice,
      wallet: settings.solanaWallet,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch transactions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
