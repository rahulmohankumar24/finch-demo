import { LitigationTaskManager, MatterData } from './litigation-system';

// Simple in-memory storage for demo purposes
// In production, you'd use a database like PostgreSQL, MongoDB, etc.
class MemoryStorage {
  private data: Record<string, MatterData> = {};

  async save(matterId: string, matterData: MatterData): Promise<void> {
    this.data[matterId] = matterData;
  }

  async load(matterId: string): Promise<MatterData | null> {
    return this.data[matterId] || null;
  }

  async loadAll(): Promise<Record<string, MatterData>> {
    return { ...this.data };
  }

  async delete(matterId: string): Promise<void> {
    delete this.data[matterId];
  }

  async exists(matterId: string): Promise<boolean> {
    return matterId in this.data;
  }
}

export const storage = new MemoryStorage();

// Global manager instance for the serverless environment
let globalManager: LitigationTaskManager | null = null;

export async function getManager(): Promise<LitigationTaskManager> {
  if (!globalManager) {
    globalManager = new LitigationTaskManager();
    // Load existing data
    const allData = await storage.loadAll();
    globalManager.importData(allData);
  }
  return globalManager;
}

export async function saveManager(manager: LitigationTaskManager): Promise<void> {
  const data = manager.exportData();
  for (const [matterId, matterData] of Object.entries(data)) {
    await storage.save(matterId, matterData);
  }
}