import { NextRequest, NextResponse } from 'next/server';
import zeroidApi from '@/lib/api/zeroid';

export async function GET(request: NextRequest) {
  try {
    const balance = await zeroidApi.getBalance();
    console.log('[API] Balance from ZeroID:', balance);
    return NextResponse.json(balance);
  } catch (error) {
    console.error('Fetch balance error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch balance';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
