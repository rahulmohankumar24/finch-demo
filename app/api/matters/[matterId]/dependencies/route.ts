import { NextRequest, NextResponse } from 'next/server';
import { getManager } from '@/lib/storage';
import { DependencyType } from '@/lib/litigation-system';

export async function GET(
  request: NextRequest,
  { params }: { params: { matterId: string } }
) {
  try {
    const manager = await getManager();
    const matter = manager.getMatter(params.matterId);

    if (!matter) {
      return NextResponse.json(
        { success: false, error: 'Matter not found' },
        { status: 404 }
      );
    }

    const taskDependencies: Record<string, Array<{
      type: string;
      targetTask: string;
      targetTaskName: string;
      timeDelayWeeks?: number;
      description: string;
      isMet: boolean;
    }>> = {};

    // Build dependency information for each task
    for (const [taskId, task] of Object.entries(matter.tasks)) {
      taskDependencies[taskId] = [];

      for (const dependency of task.dependencies) {
        const targetTask = matter.getTask(dependency.targetTaskId);
        if (!targetTask) continue;

        let description = '';
        let isMet = false;

        if (dependency.dependencyType === DependencyType.TASK_COMPLETION) {
          description = `Complete: ${targetTask.name}`;
          isMet = targetTask.completed;
        } else if (dependency.dependencyType === DependencyType.TIME_BASED) {
          const weeks = dependency.timeDelayWeeks || 0;
          description = `Wait: ${weeks} week${weeks !== 1 ? 's' : ''} after ${targetTask.name}`;

          if (targetTask.completed && targetTask.completionDate) {
            const requiredDate = new Date(targetTask.completionDate);
            requiredDate.setDate(requiredDate.getDate() + weeks * 7);
            isMet = new Date() >= requiredDate;
          } else {
            isMet = false;
          }
        }

        taskDependencies[taskId].push({
          type: dependency.dependencyType,
          targetTask: dependency.targetTaskId,
          targetTaskName: targetTask.name,
          timeDelayWeeks: dependency.timeDelayWeeks,
          description,
          isMet
        });
      }
    }

    // Also include task status information
    const taskStatuses: Record<string, {
      name: string;
      completed: boolean;
      completionDate?: string;
      dependenciesMet: boolean;
      canExecute: boolean;
    }> = {};

    for (const [taskId, task] of Object.entries(matter.tasks)) {
      const dependenciesMet = task.checkDependenciesMet(matter.tasks);
      taskStatuses[taskId] = {
        name: task.name,
        completed: task.completed,
        completionDate: task.completionDate?.toISOString(),
        dependenciesMet,
        canExecute: !task.completed && dependenciesMet
      };
    }

    return NextResponse.json({
      success: true,
      matter: {
        matterId: matter.matterId,
        clientName: matter.clientName
      },
      dependencies: taskDependencies,
      tasks: taskStatuses
    });

  } catch (error) {
    console.error('Error fetching dependencies:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dependencies' },
      { status: 500 }
    );
  }
}