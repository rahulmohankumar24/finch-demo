import { NextRequest, NextResponse } from 'next/server';
import { getManager } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { matterId: string } }
) {
  try {
    const manager = await getManager();
    const status = manager.getMatterStatus(params.matterId);

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Matter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, matter: status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch matter status' },
      { status: 500 }
    );
  }
}