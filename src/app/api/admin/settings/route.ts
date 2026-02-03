import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

// Get/Update settings
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    let settings = await prisma.settings.findUnique({
      where: { id: 'settings' },
    });

    // Create default settings if not exist
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: 'settings',
          cardCreationFee: 40.00,
          topUpFeePercent: 2.5,
          topUpFeeFlat: 2.00,
          minTopUp: 10.00,
          maxTopUp: 5000.00,
          minDeposit: 10.00,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch settings';
    if (message === 'Unauthorized' || message === 'Admin access required') {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const {
      cardCreationFee,
      topUpFeePercent,
      topUpFeeFlat,
      minTopUp,
      maxTopUp,
      minDeposit,
      solanaWallet,
      maintenanceMode,
    } = body;

    const settings = await prisma.settings.upsert({
      where: { id: 'settings' },
      update: {
        ...(cardCreationFee !== undefined && { cardCreationFee }),
        ...(topUpFeePercent !== undefined && { topUpFeePercent }),
        ...(topUpFeeFlat !== undefined && { topUpFeeFlat }),
        ...(minTopUp !== undefined && { minTopUp }),
        ...(maxTopUp !== undefined && { maxTopUp }),
        ...(minDeposit !== undefined && { minDeposit }),
        ...(solanaWallet !== undefined && { solanaWallet }),
        ...(maintenanceMode !== undefined && { maintenanceMode }),
      },
      create: {
        id: 'settings',
        cardCreationFee: cardCreationFee ?? 40.00,
        topUpFeePercent: topUpFeePercent ?? 2.5,
        topUpFeeFlat: topUpFeeFlat ?? 2.00,
        minTopUp: minTopUp ?? 10.00,
        maxTopUp: maxTopUp ?? 5000.00,
        minDeposit: minDeposit ?? 10.00,
        solanaWallet: solanaWallet ?? null,
        maintenanceMode: maintenanceMode ?? false,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update settings';
    if (message === 'Unauthorized' || message === 'Admin access required') {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
