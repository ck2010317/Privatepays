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
      totalPaymentOrders,
      completedPaymentOrders,
      totalPaymentValue,
      settings,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true, role: 'user' } }),
      prisma.card.count(),
      prisma.cardRequest.count({ where: { status: 'pending' } }),
      prisma.paymentOrder.count(),
      prisma.paymentOrder.count({ where: { status: 'completed' } }),
      prisma.paymentOrder.aggregate({
        where: { status: 'completed' },
        _sum: { amountUsd: true },
      }),
      prisma.settings.findUnique({ where: { id: 'settings' } }),
    ]);

    // Get recent payment orders
    const recentPayments = await prisma.paymentOrder.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        type: true,
        amountUsd: true,
        status: true,
        createdAt: true,
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
        totalPaymentOrders,
        completedPaymentOrders,
        totalPaymentValue: totalPaymentValue._sum.amountUsd || 0,
      },
      settings,
      recentActivity: {
        payments: recentPayments,
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
