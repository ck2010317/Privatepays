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
    
    const sensitive = await zeroidApi.getCardSensitive(zeroidCardId);
    return NextResponse.json(sensitive);
  } catch (error) {
    console.error('Fetch sensitive card details error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch card details';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

