import { NextRequest, NextResponse } from 'next/server';
import { getManager, saveManager } from '@/lib/storage';
import { DependencyType, Dependency } from '@/lib/litigation-system';

export async function POST(request: NextRequest) {
  try {
    const { matterId, newTaskId, newTaskName, insertAfterTaskId } = await request.json();

    if (!matterId || !newTaskId || !newTaskName || !insertAfterTaskId) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
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

    const insertAfterTask = matter.getTask(insertAfterTaskId);
    if (!insertAfterTask) {
      return NextResponse.json(
        { success: false, error: 'Insert after task not found' },
        { status: 404 }
      );
    }

    // Step 1: Find all tasks that currently depend on insertAfterTaskId
    const dependentTasks: Array<{ taskId: string; dependencyIndex: number }> = [];

    for (const [taskId, task] of Object.entries(matter.tasks)) {
      task.dependencies.forEach((dep, index) => {
        if (dep.targetTaskId === insertAfterTaskId) {
          dependentTasks.push({ taskId, dependencyIndex: index });
        }
      });
    }

    console.log(`Found ${dependentTasks.length} tasks that depend on ${insertAfterTaskId}`);

    // Step 2: Update dependent tasks to point to the new task instead (before creating new task)
    let updatedTasksCount = 0;
    for (const { taskId, dependencyIndex } of dependentTasks) {
      const task = matter.getTask(taskId);
      if (task && task.dependencies[dependencyIndex]) {
        // Replace the dependency target
        task.dependencies[dependencyIndex].targetTaskId = newTaskId;
        updatedTasksCount++;
        console.log(`Updated ${taskId} to depend on ${newTaskId} instead of ${insertAfterTaskId}`);
      }
    }

    // Step 3: Create the new task with dependency on insertAfterTaskId
    const newTaskDependencies: Dependency[] = [{
      dependencyType: DependencyType.TASK_COMPLETION,
      targetTaskId: insertAfterTaskId
    }];

    const result = manager.createTask(matterId, newTaskId, newTaskName, newTaskDependencies);
    if (result.includes('not found') || result.includes('already exists')) {
      return NextResponse.json(
        { success: false, error: result },
        { status: 400 }
      );
    }

    // Step 4: Save all changes
    await saveManager(manager);

    return NextResponse.json({
      success: true,
      message: `Task "${newTaskName}" inserted after "${insertAfterTask.name}"`,
      insertedTask: {
        taskId: newTaskId,
        name: newTaskName,
        dependsOn: insertAfterTask.name
      },
      updatedDependencies: {
        count: updatedTasksCount,
        tasks: dependentTasks.map(dt => dt.taskId)
      }
    });

  } catch (error) {
    console.error('Error inserting task:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}