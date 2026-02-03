import { NextRequest, NextResponse } from 'next/server';
import zeroidApi from '@/lib/api/zeroid';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params;
    const card = await zeroidApi.getCard(cardId);
    return NextResponse.json(card);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch card';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
