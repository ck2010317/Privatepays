import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Get card details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { cardId } = await params;

    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        userId: user.id,
      },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        topUpRequests: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    return NextResponse.json({ card });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch card';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
