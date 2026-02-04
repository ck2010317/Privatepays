import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
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

    // First, check if cardId is a database ID or ZeroID ID
    let zeroidCardId = cardId;
    
    // Try to find in database first
    const dbCard = await prisma.card.findUnique({
      where: { id: cardId },
    });
    
    if (dbCard?.zeroidCardId) {
      zeroidCardId = dbCard.zeroidCardId;
    }

    const result = await zeroidApi.getCardTransactions(zeroidCardId, {
      skip,
      limit,
      from_date,
      to_date,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Fetch card transactions error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch transactions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
