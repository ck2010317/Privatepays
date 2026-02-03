import { NextRequest, NextResponse } from 'next/server';
import zeroidApi from '@/lib/api/zeroid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency');
    const payment_system = searchParams.get('payment_system');
    const amount = searchParams.get('amount');
    const signature = searchParams.get('signature') === 'true';

    if (!currency || !payment_system) {
      return NextResponse.json(
        { error: 'currency and payment_system are required' },
        { status: 400 }
      );
    }

    const result = await zeroidApi.getDepositAddress({
      currency,
      payment_system,
      amount: amount ? parseFloat(amount) : 100,
      signature,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get deposit address';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
