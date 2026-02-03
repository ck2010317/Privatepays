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

    const deposit = await prisma.deposit.findUnique({
      where: { id: depositId },
      include: { user: true },
    });

    if (!deposit) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
    }

    // Deposits are deprecated - use payment-orders instead
    return NextResponse.json({ 
      error: 'Deposits are deprecated. Users now pay directly with SOL via payment orders.',
      note: 'Check payment-orders API instead'
    }, { status: 410 });
  } catch (error) {
    console.error('Deposit error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process deposit';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
