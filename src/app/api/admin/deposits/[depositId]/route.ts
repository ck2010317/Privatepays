import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// Confirm or reject deposit
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ depositId: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    const { depositId } = await params;
    const body = await request.json();
    const { action, confirmedAmount } = body; // action: 'confirm' or 'reject'

    const deposit = await prisma.deposit.findUnique({
      where: { id: depositId },
      include: { user: true },
    });

    if (!deposit) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
    }

    if (deposit.status !== 'pending') {
      return NextResponse.json(
        { error: 'Deposit already processed' },
        { status: 400 }
      );
    }

    if (action === 'confirm') {
      const amount = confirmedAmount || deposit.amount;

      // Update user balance
      await prisma.user.update({
        where: { id: deposit.userId },
        data: { balance: { increment: amount } },
      });

      // Update deposit
      await prisma.deposit.update({
        where: { id: depositId },
        data: {
          status: 'confirmed',
          amount: amount,
          confirmedBy: admin.id,
          confirmedAt: new Date(),
        },
      });

      // Update transaction
      await prisma.transaction.updateMany({
        where: {
          reference: depositId,
          type: 'deposit',
        },
        data: {
          status: 'completed',
          amount: amount,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Deposit confirmed. $${amount.toFixed(2)} added to user balance.`,
      });
    } else if (action === 'reject') {
      // Update deposit
      await prisma.deposit.update({
        where: { id: depositId },
        data: { status: 'failed' },
      });

      // Update transaction
      await prisma.transaction.updateMany({
        where: {
          reference: depositId,
          type: 'deposit',
        },
        data: { status: 'failed' },
      });

      return NextResponse.json({
        success: true,
        message: 'Deposit rejected',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process deposit';
    if (message === 'Unauthorized' || message === 'Admin access required') {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
