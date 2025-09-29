import { NextRequest, NextResponse } from 'next/server';
import { getManager, saveManager } from '@/lib/storage';

export async function POST(
  request: NextRequest,
  { params }: { params: { clientId: string } }
) {
  try {
    const { clientId } = params;
    const { matterId, matterName, clientName } = await request.json();

    if (!matterId || !matterName || !clientName) {
      return NextResponse.json(
        { success: false, error: 'matterId, matterName, and clientName are required' },
        { status: 400 }
      );
    }

    const manager = await getManager();

    // Check if matter already exists
    const existingMatter = manager.getMatter(matterId);
    if (existingMatter) {
      return NextResponse.json(
        { success: false, error: `Matter with ID '${matterId}' already exists` },
        { status: 400 }
      );
    }

    // Create matter with client association
    const matter = manager.createMatter(matterId, clientId, clientName, matterName);

    // Save to database
    await saveManager(manager);

    return NextResponse.json({
      success: true,
      message: `Matter "${matterName}" created for client "${clientName}"`,
      matter: {
        matterId: matter.matterId,
        matterName: matterName,
        clientId: matter.clientId,
        clientName: matter.clientName,
        createdDate: matter.createdDate.toISOString(),
        totalTasks: Object.keys(matter.tasks).length,
        completedTasks: Object.values(matter.tasks).filter(task => task.completed).length
      }
    });

  } catch (error) {
    console.error('Error creating matter:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}