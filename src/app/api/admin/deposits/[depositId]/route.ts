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
