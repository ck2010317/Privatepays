import { NextRequest, NextResponse } from 'next/server';
import zeroidApi from '@/lib/api/zeroid';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params;
    const body = await request.json();
    const result = await zeroidApi.topUpCard(cardId, body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to top up card';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
