import { NextRequest, NextResponse } from 'next/server';
import zeroidApi from '@/lib/api/zeroid';

export async function GET() {
  try {
    const currencies = await zeroidApi.getCurrencies();
    return NextResponse.json({ currencies });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch currencies';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
