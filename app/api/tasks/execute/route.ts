import { NextRequest, NextResponse } from 'next/server';
import { getManager, saveManager } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Request body:', body);

    const { matterId, taskId } = body;

    if (!matterId || !taskId) {
      return NextResponse.json(
        { success: false, error: `matterId and taskId are required. Received: matterId=${matterId}, taskId=${taskId}` },
        { status: 400 }
      );
    }

    console.log(`Executing task: ${taskId} for matter: ${matterId}`);

    const manager = await getManager();

    // Debug: Check if matter exists
    const matter = manager.getMatter(matterId);
    if (!matter) {
      console.log(`Matter ${matterId} not found in manager`);
      return NextResponse.json({
        success: false,
        error: `Matter ${matterId} not found`
      }, { status: 404 });
    }

    // Debug: Check if task exists
    const task = matter.getTask(taskId);
    if (!task) {
      console.log(`Task ${taskId} not found in matter ${matterId}`);
      console.log('Available tasks:', Object.keys(matter.tasks));
      return NextResponse.json({
        success: false,
        error: `Task ${taskId} not found. Available tasks: ${Object.keys(matter.tasks).join(', ')}`
      }, { status: 404 });
    }

    console.log(`Found task: ${task.name}, completed: ${task.completed}`);

    const result = manager.triggerTask(matterId, taskId);
    console.log(`Task execution result: ${result}`);

    // Save state after task execution
    await saveManager(manager);

    return NextResponse.json({
      success: true,
      result,
      executed: result.includes('complete')
    });
  } catch (error) {
    console.error('Error in task execution:', error);
    return NextResponse.json(
      { success: false, error: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}