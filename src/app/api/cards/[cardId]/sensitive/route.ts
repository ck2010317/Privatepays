import { NextRequest, NextResponse } from 'next/server';
import zeroidApi from '@/lib/api/zeroid';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params;
    const sensitive = await zeroidApi.getCardSensitive(cardId);
    return NextResponse.json(sensitive);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch card details';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
