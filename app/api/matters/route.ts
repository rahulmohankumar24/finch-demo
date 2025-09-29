import { NextRequest, NextResponse } from 'next/server';
import { getManager, saveManager } from '@/lib/storage';

export async function GET() {
  try {
    const manager = await getManager();
    const matters = manager.listMatters();
    return NextResponse.json({ success: true, matters });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch matters' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { matterId, clientName } = await request.json();

    if (!matterId || !clientName) {
      return NextResponse.json(
        { success: false, error: 'matterId and clientName are required' },
        { status: 400 }
      );
    }

    const manager = await getManager();

    try {
      const matter = manager.createMatter(matterId, clientName);
      console.log(`Created matter ${matterId} with ${Object.keys(matter.tasks).length} default tasks`);
      console.log('Default tasks:', Object.keys(matter.tasks));

      await saveManager(manager);
      console.log('Matter and tasks saved to database');

      return NextResponse.json({
        success: true,
        message: `Matter ${matterId} created for ${clientName}`,
        matter: {
          matterId: matter.matterId,
          clientName: matter.clientName,
          createdDate: matter.createdDate.toISOString(),
          taskCount: Object.keys(matter.tasks).length
        }
      });
    } catch (error) {
      console.error('Error creating matter:', error);
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}