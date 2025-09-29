import {
  LitigationTaskManager,
  MatterData,
  TaskData,
  Dependency,
  DependencyType,
  Matter,
  Task
} from './litigation-system';
import { supabase } from './supabase';

interface DBMatter {
  matter_id: string;
  client_name: string;
  created_date: string;
}

interface DBTask {
  matter_id: string;
  task_id: string;
  name: string;
  completed: boolean;
  completion_date: string | null;
  created_date: string;
}

interface DBDependency {
  matter_id: string;
  task_id: string;
  dependency_type: string;
  target_task_id: string;
  time_delay_weeks: number | null;
}

class SupabaseStorage {
  async saveMatter(matterData: MatterData): Promise<void> {
    const { data: existingMatter } = await supabase
      .from('matters')
      .select('matter_id')
      .eq('matter_id', matterData.matterId)
      .single();

    // Insert or update matter
    if (!existingMatter) {
      const { error: matterError } = await supabase
        .from('matters')
        .insert({
          matter_id: matterData.matterId,
          client_name: matterData.clientName,
          created_date: matterData.createdDate
        });

      if (matterError) {
        throw new Error(`Failed to save matter: ${matterError.message}`);
      }
    }

    // Save all tasks
    for (const [taskId, taskData] of Object.entries(matterData.tasks)) {
      await this.saveTask(matterData.matterId, taskData);
    }
  }

  async saveTask(matterId: string, taskData: TaskData): Promise<void> {
    // Upsert task
    const { error: taskError } = await supabase
      .from('tasks')
      .upsert({
        matter_id: matterId,
        task_id: taskData.taskId,
        name: taskData.name,
        completed: taskData.completed,
        completion_date: taskData.completionDate,
        created_date: taskData.createdDate
      });

    if (taskError) {
      throw new Error(`Failed to save task: ${taskError.message}`);
    }

    // Delete existing dependencies
    await supabase
      .from('task_dependencies')
      .delete()
      .eq('matter_id', matterId)
      .eq('task_id', taskData.taskId);

    // Insert new dependencies
    if (taskData.dependencies.length > 0) {
      const dependencyRows = taskData.dependencies.map(dep => ({
        matter_id: matterId,
        task_id: taskData.taskId,
        dependency_type: dep.dependencyType,
        target_task_id: dep.targetTaskId,
        time_delay_weeks: dep.timeDelayWeeks || null
      }));

      const { error: depError } = await supabase
        .from('task_dependencies')
        .insert(dependencyRows);

      if (depError) {
        throw new Error(`Failed to save dependencies: ${depError.message}`);
      }
    }
  }

  async loadMatter(matterId: string): Promise<MatterData | null> {
    // Load matter
    const { data: matter, error: matterError } = await supabase
      .from('matters')
      .select('*')
      .eq('matter_id', matterId)
      .single();

    if (matterError || !matter) {
      return null;
    }

    // Load tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('matter_id', matterId);

    if (tasksError) {
      throw new Error(`Failed to load tasks: ${tasksError.message}`);
    }

    // Load dependencies
    const { data: dependencies, error: depsError } = await supabase
      .from('task_dependencies')
      .select('*')
      .eq('matter_id', matterId);

    if (depsError) {
      throw new Error(`Failed to load dependencies: ${depsError.message}`);
    }

    // Build tasks object
    const tasksData: Record<string, TaskData> = {};

    for (const task of tasks || []) {
      const taskDeps = (dependencies || [])
        .filter(dep => dep.task_id === task.task_id)
        .map(dep => ({
          dependencyType: dep.dependency_type as DependencyType,
          targetTaskId: dep.target_task_id,
          timeDelayWeeks: dep.time_delay_weeks || undefined
        }));

      tasksData[task.task_id] = {
        taskId: task.task_id,
        name: task.name,
        dependencies: taskDeps,
        completed: task.completed,
        completionDate: task.completion_date,
        createdDate: task.created_date
      };
    }

    return {
      matterId: matter.matter_id,
      clientName: matter.client_name,
      tasks: tasksData,
      createdDate: matter.created_date
    };
  }

  async loadAllMatters(): Promise<Record<string, MatterData>> {
    const { data: matters, error } = await supabase
      .from('matters')
      .select('matter_id');

    if (error) {
      throw new Error(`Failed to load matters: ${error.message}`);
    }

    const allData: Record<string, MatterData> = {};

    for (const matter of matters || []) {
      const matterData = await this.loadMatter(matter.matter_id);
      if (matterData) {
        allData[matter.matter_id] = matterData;
      }
    }

    return allData;
  }

  async deleteMatter(matterId: string): Promise<void> {
    const { error } = await supabase
      .from('matters')
      .delete()
      .eq('matter_id', matterId);

    if (error) {
      throw new Error(`Failed to delete matter: ${error.message}`);
    }
  }

  async exists(matterId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('matters')
      .select('matter_id')
      .eq('matter_id', matterId)
      .single();

    return !error && !!data;
  }
}

export const storage = new SupabaseStorage();

// Global manager instance for the serverless environment
let globalManager: LitigationTaskManager | null = null;

export async function getManager(): Promise<LitigationTaskManager> {
  if (!globalManager) {
    globalManager = new LitigationTaskManager();
    // Load existing data from Supabase
    try {
      console.log('Loading data from Supabase...');
      const allData = await storage.loadAllMatters();
      console.log('Loaded matters:', Object.keys(allData));
      globalManager.importData(allData);
    } catch (error) {
      console.error('Failed to load data from Supabase:', error);
      console.error('Error details:', error instanceof Error ? error.message : error);
      // Continue with empty manager if database is not available
    }
  }
  return globalManager;
}

export async function saveManager(manager: LitigationTaskManager): Promise<void> {
  const data = manager.exportData();
  for (const [matterId, matterData] of Object.entries(data)) {
    await storage.saveMatter(matterData);
  }
}