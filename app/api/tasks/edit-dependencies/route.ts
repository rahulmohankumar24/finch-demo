import { NextRequest, NextResponse } from 'next/server';
import { getManager, saveManager } from '@/lib/storage';
import { Dependency } from '@/lib/litigation-system';

export async function POST(request: NextRequest) {
  try {
    const { matterId, taskId, dependencies } = await request.json();

    if (!matterId || !taskId || !Array.isArray(dependencies)) {
      return NextResponse.json(
        { success: false, error: 'matterId, taskId, and dependencies array are required' },
        { status: 400 }
      );
    }

    const manager = await getManager();
    const matter = manager.getMatter(matterId);

    if (!matter) {
      return NextResponse.json(
        { success: false, error: 'Matter not found' },
        { status: 404 }
      );
    }

    const task = matter.getTask(taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Validate that all target tasks exist
    for (const dep of dependencies as Dependency[]) {
      if (!matter.getTask(dep.targetTaskId)) {
        return NextResponse.json(
          { success: false, error: `Target task "${dep.targetTaskId}" not found` },
          { status: 400 }
        );
      }
    }

    // Update task dependencies
    task.dependencies = dependencies as Dependency[];

    // Save changes
    await saveManager(manager);

    return NextResponse.json({
      success: true,
      message: `Dependencies updated for task "${task.name}"`,
      task: {
        taskId: task.taskId,
        name: task.name,
        dependencies: task.dependencies
      }
    });

  } catch (error) {
    console.error('Error editing task dependencies:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}