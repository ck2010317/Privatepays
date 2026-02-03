import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// Get all pending top-up requests
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const requests = await prisma.topUpRequest.findMany({
      where: status !== 'all' ? { status } : {},
      include: {
        card: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch requests';
    if (message === 'Unauthorized' || message === 'Admin access required') {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
