import { NextRequest, NextResponse } from 'next/server';
import zeroidApi from '@/lib/api/zeroid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transaction_type = searchParams.get('transaction_type') || undefined;
    const skip = parseInt(searchParams.get('skip') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');

    const result = await zeroidApi.getIncomePayments({
      transaction_type,
      skip,
      limit,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch income payments';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
