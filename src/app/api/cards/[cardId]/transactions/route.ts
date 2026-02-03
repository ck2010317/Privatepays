import { NextRequest, NextResponse } from 'next/server';
import zeroidApi from '@/lib/api/zeroid';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params;
    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0');
    const limit = parseInt(searchParams.get('limit') || '20');
    const from_date = searchParams.get('from_date') || undefined;
    const to_date = searchParams.get('to_date') || undefined;

    const result = await zeroidApi.getCardTransactions(cardId, {
      skip,
      limit,
      from_date,
      to_date,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch transactions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
