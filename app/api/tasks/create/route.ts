import { NextRequest, NextResponse } from 'next/server';
import { getManager, saveManager } from '@/lib/storage';
import { Dependency } from '@/lib/litigation-system';

export async function POST(request: NextRequest) {
  try {
    const { matterId, taskId, name, dependencies = [] } = await request.json();

    if (!matterId || !taskId || !name) {
      return NextResponse.json(
        { success: false, error: 'matterId, taskId, and name are required' },
        { status: 400 }
      );
    }

    const manager = await getManager();
    const result = manager.createTask(matterId, taskId, name, dependencies as Dependency[]);

    if (result.includes('not found') || result.includes('already exists')) {
      return NextResponse.json(
        { success: false, error: result },
        { status: 400 }
      );
    }

    // Save state after task creation
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