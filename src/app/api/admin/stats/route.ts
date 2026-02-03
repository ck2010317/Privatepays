import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// Get admin dashboard stats
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const [
      totalUsers,
      activeUsers,
      totalCards,
      pendingCardRequests,
      pendingDeposits,
      pendingTopUps,
      totalDepositsValue,
      settings,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true, role: 'user' } }),
      prisma.card.count(),
      prisma.cardRequest.count({ where: { status: 'pending' } }),
      prisma.deposit.count({ where: { status: 'pending' } }),
      prisma.topUpRequest.count({ where: { status: 'pending' } }),
      prisma.deposit.aggregate({
        where: { status: 'confirmed' },
        _sum: { amount: true },
      }),
      prisma.settings.findUnique({ where: { id: 'settings' } }),
    ]);

    // Get recent activity
    const recentDeposits = await prisma.deposit.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    const recentCardRequests = await prisma.cardRequest.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        totalCards,
        pendingCardRequests,
        pendingDeposits,
        pendingTopUps,
        totalPending: pendingCardRequests + pendingDeposits + pendingTopUps,
        totalDepositsValue: totalDepositsValue._sum.amount || 0,
      },
      settings,
      recentActivity: {
        deposits: recentDeposits,
        cardRequests: recentCardRequests,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stats';
    if (message === 'Unauthorized' || message === 'Admin access required') {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
