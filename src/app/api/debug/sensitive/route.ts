import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import zeroidApi from '@/lib/api/zeroid';

/**
 * DEBUG ENDPOINT - Test sensitive data fetching
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get('cardId');
    
    if (!cardId) {
      return NextResponse.json({ error: 'cardId parameter required' }, { status: 400 });
    }

    console.log(`[DEBUG] Fetching sensitive data for card: ${cardId}`);

    // Look up zeroidCardId
    const dbCard = await prisma.card.findUnique({
      where: { id: cardId },
    });

    console.log(`[DEBUG] Database card found:`, dbCard);

    if (!dbCard?.zeroidCardId) {
      return NextResponse.json({
        error: 'Card not found or missing zeroidCardId',
        dbCard,
      }, { status: 404 });
    }

    const zeroidCardId = dbCard.zeroidCardId;
    console.log(`[DEBUG] Using zeroidCardId: ${zeroidCardId}`);

    // Fetch sensitive data
    const sensitiveData = await zeroidApi.getCardSensitive(zeroidCardId);
    console.log(`[DEBUG] ZeroID sensitive response:`, sensitiveData);

    return NextResponse.json({
      success: true,
      dbCard,
      zeroidCardId,
      sensitiveData,
    });
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch sensitive data',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack',
    }, { status: 500 });
  }
}
