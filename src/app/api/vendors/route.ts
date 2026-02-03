import { NextRequest, NextResponse } from 'next/server';
import zeroidApi from '@/lib/api/zeroid';

export async function GET() {
  try {
    const vendors = await zeroidApi.getVendors();
    return NextResponse.json({ vendors });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch vendors';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
