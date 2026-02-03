import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Get user's transactions
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
      include: {
        card: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    const total = await prisma.transaction.count({
      where: { userId: user.id },
    });

    return NextResponse.json({
      transactions,
      total,
      hasMore: skip + transactions.length < total,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch transactions';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
