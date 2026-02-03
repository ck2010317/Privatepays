import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/user/settings - Get public settings (fees, limits)
export async function GET() {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 'settings' },
    });

    if (!settings) {
      return NextResponse.json({
        cardCreationFee: 40,
        topUpFeePercent: 2.5,
        topUpFeeFlat: 2,
        minDeposit: 10,
        minTopUp: 10,
        maxTopUp: 5000,
      });
    }

    // Return only public settings (not admin-only fields)
    return NextResponse.json({
      cardCreationFee: settings.cardCreationFee,
      topUpFeePercent: settings.topUpFeePercent,
      topUpFeeFlat: settings.topUpFeeFlat,
      minDeposit: settings.minDeposit,
      minTopUp: settings.minTopUp,
      maxTopUp: settings.maxTopUp,
    });
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}
