import { NextRequest, NextResponse } from 'next/server';
import zeroidApi from '@/lib/api/zeroid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await zeroidApi.getCards(skip, limit);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch cards';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Creating card with body:', body);
    const result = await zeroidApi.createCard(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Card creation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create card';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
