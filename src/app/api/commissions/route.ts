import { NextRequest, NextResponse } from 'next/server';
import zeroidApi from '@/lib/api/zeroid';

export async function GET() {
  try {
    const commissions = await zeroidApi.getCardCommissions();
    return NextResponse.json({ commissions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch commissions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
