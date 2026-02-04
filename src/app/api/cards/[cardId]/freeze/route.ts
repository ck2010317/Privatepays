import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import zeroidApi from '@/lib/api/zeroid';

export async function POST(
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
    
    const result = await zeroidApi.freezeCard(zeroidCardId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Freeze card error:', error);
    const message = error instanceof Error ? error.message : 'Failed to freeze card';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
