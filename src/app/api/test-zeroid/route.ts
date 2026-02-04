import { NextRequest, NextResponse } from 'next/server';
import zeroidApi from '@/lib/api/zeroid';

/**
 * TEST ENDPOINT - Test ZeroID card creation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, email, phone_number } = body;

    console.log('Testing ZeroID card creation with:', {
      title: title || 'Test Card',
      email: email || 'test@example.com',
      phone_number: phone_number || '+10000000000',
      card_commission_id: '5',
      currency_id: 'usdt',
    });

    const result = await zeroidApi.createCard({
      title: title || 'Test Card',
      email: email || 'test@example.com',
      phone_number: phone_number || '+10000000000',
      card_commission_id: '5',
      currency_id: 'usdc',
    });

    console.log('ZeroID Response:', result);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('ZeroID Test Error:', error);
    return NextResponse.json({
      error: 'ZeroID API Error',
      message: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.stack : 'No stack',
    }, { status: 500 });
  }
}
