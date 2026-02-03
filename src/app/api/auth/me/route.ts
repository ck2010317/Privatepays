import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, initializeAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Initialize admin on first request
    await initializeAdmin();

    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
