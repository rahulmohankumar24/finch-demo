import { NextRequest, NextResponse } from 'next/server';
import { getManager, saveManager } from '@/lib/storage';

export async function POST(
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

    // Check which default tasks are missing
    const defaultTaskIds = ['intake_call', 'sign_engagement', 'collect_medical_records', 'client_checkin', 'create_demand'];
    const existingTaskIds = Object.keys(matter.tasks);
    const missingTaskIds = defaultTaskIds.filter(id => !existingTaskIds.includes(id));

    if (missingTaskIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All default tasks already exist',
        tasks: existingTaskIds
      });
    }

    // Recreate the matter to get all default tasks
    const clientId = matter.clientId;
    const clientName = matter.clientName;

    // Delete and recreate matter in memory
    delete manager['matters'][params.matterId];
    const newMatter = manager.createMatter(params.matterId, clientId, clientName);

    // Save to database
    await saveManager(manager);

    return NextResponse.json({
      success: true,
      message: `Repaired matter ${params.matterId}`,
      addedTasks: missingTaskIds,
      totalTasks: Object.keys(newMatter.tasks).length
    });

  } catch (error) {
    console.error('Error repairing matter:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}