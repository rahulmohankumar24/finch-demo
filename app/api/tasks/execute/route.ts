import { NextRequest, NextResponse } from 'next/server';
import { getManager, saveManager } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const { matterId, taskId } = await request.json();

    if (!matterId || !taskId) {
      return NextResponse.json(
        { success: false, error: 'matterId and taskId are required' },
        { status: 400 }
      );
    }

    const manager = await getManager();
    const result = manager.triggerTask(matterId, taskId);

    // Save state after task execution
    await saveManager(manager);

    return NextResponse.json({
      success: true,
      result,
      executed: result.includes('complete')
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}