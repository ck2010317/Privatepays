import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// Get all users (admin only)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        balance: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            cards: true,
            deposits: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch users';
    if (message === 'Unauthorized' || message === 'Admin access required') {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
