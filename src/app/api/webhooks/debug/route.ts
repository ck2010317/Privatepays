import { NextRequest, NextResponse } from 'next/server';

/**
 * DEBUG ENDPOINT - Catches any webhook attempt
 * GET or POST to see if anything is reaching this endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headers = Object.fromEntries(request.headers.entries());
    
    console.log('=== WEBHOOK DEBUG - POST RECEIVED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Headers:', JSON.stringify(headers, null, 2));
    console.log('Body:', JSON.stringify(body, null, 2));
    
    return NextResponse.json({ 
      success: true, 
      received: new Date().toISOString(),
      bodySize: JSON.stringify(body).length 
    });
  } catch (error) {
    console.error('Debug webhook error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'Debug webhook endpoint active',
    url: 'https://privatepays.vercel.app/api/webhooks/debug'
  });
}
