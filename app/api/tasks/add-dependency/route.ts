import { NextRequest, NextResponse } from 'next/server';
import { getManager, saveManager } from '@/lib/storage';
import { Dependency } from '@/lib/litigation-system';

export async function POST(request: NextRequest) {
  try {
    const { matterId, taskId, dependency } = await request.json();

    if (!matterId || !taskId || !dependency) {
      return NextResponse.json(
        { success: false, error: 'matterId, taskId, and dependency are required' },
        { status: 400 }
      );
    }

    const manager = await getManager();
    const result = manager.addDependency(matterId, taskId, dependency as Dependency);

    if (result.includes('not found')) {
      return NextResponse.json(
        { success: false, error: result },
        { status: 400 }
      );
    }

    // Save state after adding dependency
    await saveManager(manager);

    return NextResponse.json({
      success: true,
      message: result
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}