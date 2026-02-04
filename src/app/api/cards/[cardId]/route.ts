import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import zeroidApi from '@/lib/api/zeroid';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params;
    
    // First, check if cardId is a database ID or ZeroID ID
    let zeroidCardId = cardId;
    
    // Try to find in database first
    const dbCard = await prisma.card.findUnique({
      where: { id: cardId },
    });
    
    if (dbCard?.zeroidCardId) {
      zeroidCardId = dbCard.zeroidCardId;
    }
    
    const card = await zeroidApi.getCard(zeroidCardId);
    console.log('[API] Card from ZeroID:', {
      cardId,
      zeroidCardId,
      card,
      balance: card.balance,
    });
    return NextResponse.json(card);
  } catch (error) {
    console.error('Fetch card error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch card';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
