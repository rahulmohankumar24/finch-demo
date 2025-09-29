export enum DependencyType {
  TASK_COMPLETION = "task_completion",
  TIME_BASED = "time_based"
}

export interface Dependency {
  dependencyType: DependencyType;
  targetTaskId: string;
  timeDelayWeeks?: number;
}

export interface TaskData {
  taskId: string;
  name: string;
  dependencies: Dependency[];
  completed: boolean;
  completionDate?: string;
  createdDate: string;
}

export interface MatterData {
  matterId: string;
  clientName: string;
  tasks: Record<string, TaskData>;
  createdDate: string;
}

export interface TaskStatus {
  name: string;
  completed: boolean;
  completionDate?: string;
  dependenciesMet: boolean;
  canExecute: boolean;
}

export interface MatterStatus {
  matterId: string;
  clientName: string;
  createdDate: string;
  tasks: Record<string, TaskStatus>;
}

export interface MatterSummary {
  matterId: string;
  clientName: string;
  createdDate: string;
  totalTasks: number;
  completedTasks: number;
}

export class Task {
  taskId: string;
  name: string;
  dependencies: Dependency[];
  completed: boolean;
  completionDate?: Date;
  createdDate: Date;

  constructor(taskId: string, name: string, dependencies: Dependency[] = []) {
    this.taskId = taskId;
    this.name = name;
    this.dependencies = dependencies;
    this.completed = false;
    this.createdDate = new Date();
  }

  markComplete(): void {
    this.completed = true;
    this.completionDate = new Date();
  }

  addDependency(dependency: Dependency): void {
    this.dependencies.push(dependency);
  }

  checkDependenciesMet(allTasks: Record<string, Task>): boolean {
    for (const dep of this.dependencies) {
      if (dep.dependencyType === DependencyType.TASK_COMPLETION) {
        const targetTask = allTasks[dep.targetTaskId];
        if (!targetTask || !targetTask.completed) {
          return false;
        }
      } else if (dep.dependencyType === DependencyType.TIME_BASED) {
        const targetTask = allTasks[dep.targetTaskId];
        if (!targetTask || !targetTask.completed || !targetTask.completionDate) {
          return false;
        }

        const requiredDate = new Date(targetTask.completionDate);
        requiredDate.setDate(requiredDate.getDate() + (dep.timeDelayWeeks || 0) * 7);

        if (new Date() < requiredDate) {
          return false;
        }
      }
    }
    return true;
  }

  toData(): TaskData {
    return {
      taskId: this.taskId,
      name: this.name,
      dependencies: this.dependencies,
      completed: this.completed,
      completionDate: this.completionDate?.toISOString(),
      createdDate: this.createdDate.toISOString()
    };
  }

  static fromData(data: TaskData): Task {
    const task = new Task(data.taskId, data.name, data.dependencies);
    task.completed = data.completed;
    task.completionDate = data.completionDate ? new Date(data.completionDate) : undefined;
    task.createdDate = new Date(data.createdDate);
    return task;
  }
}

export class Matter {
  matterId: string;
  clientName: string;
  tasks: Record<string, Task>;
  createdDate: Date;

  constructor(matterId: string, clientName: string) {
    this.matterId = matterId;
    this.clientName = clientName;
    this.tasks = {};
    this.createdDate = new Date();
    this.createDefaultTasks();
  }

  private createDefaultTasks(): void {
    // 1. Intake call (no dependencies)
    const intakeCall = new Task("intake_call", "Intake Call");

    // 2. Sign engagement letter (depends on intake call)
    const signEngagement = new Task("sign_engagement", "Sign Engagement Letter");
    signEngagement.addDependency({
      dependencyType: DependencyType.TASK_COMPLETION,
      targetTaskId: "intake_call"
    });

    // 3. Collect medical records (depends on sign engagement letter)
    const collectRecords = new Task("collect_medical_records", "Collect Medical Records");
    collectRecords.addDependency({
      dependencyType: DependencyType.TASK_COMPLETION,
      targetTaskId: "sign_engagement"
    });

    // 4. Client check in (sign engagement complete + 2 weeks since intake call)
    const clientCheckin = new Task("client_checkin", "Client Check In");
    clientCheckin.addDependency({
      dependencyType: DependencyType.TASK_COMPLETION,
      targetTaskId: "sign_engagement"
    });
    clientCheckin.addDependency({
      dependencyType: DependencyType.TIME_BASED,
      targetTaskId: "intake_call",
      timeDelayWeeks: 2
    });

    // 5. Create demand (depends on collect medical records)
    const createDemand = new Task("create_demand", "Create Demand");
    createDemand.addDependency({
      dependencyType: DependencyType.TASK_COMPLETION,
      targetTaskId: "collect_medical_records"
    });

    // Add all tasks to the matter
    const tasks = [intakeCall, signEngagement, collectRecords, clientCheckin, createDemand];
    for (const task of tasks) {
      this.tasks[task.taskId] = task;
    }
  }

  addTask(taskId: string, name: string, dependencies: Dependency[] = []): Task {
    if (this.tasks[taskId]) {
      throw new Error(`Task with ID '${taskId}' already exists`);
    }

    const task = new Task(taskId, name, dependencies);
    this.tasks[taskId] = task;
    return task;
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks[taskId];
  }

  executeTask(taskId: string): string {
    const task = this.tasks[taskId];
    if (!task) {
      return `Task ${taskId} not found`;
    }

    if (task.completed) {
      return `Task ${task.name} already completed`;
    }

    if (task.checkDependenciesMet(this.tasks)) {
      task.markComplete();
      return `Task ${task.name} complete`;
    } else {
      return `Task ${task.name} not ready`;
    }
  }

  addDependencyToTask(taskId: string, dependency: Dependency): void {
    const task = this.tasks[taskId];
    if (!task) {
      throw new Error(`Task with ID '${taskId}' not found`);
    }
    task.addDependency(dependency);
  }

  getTaskStatus(): Record<string, TaskStatus> {
    const status: Record<string, TaskStatus> = {};

    for (const [taskId, task] of Object.entries(this.tasks)) {
      const dependenciesMet = task.checkDependenciesMet(this.tasks);
      status[taskId] = {
        name: task.name,
        completed: task.completed,
        completionDate: task.completionDate?.toISOString(),
        dependenciesMet,
        canExecute: !task.completed && dependenciesMet
      };
    }

    return status;
  }

  toData(): MatterData {
    const tasksData: Record<string, TaskData> = {};
    for (const [taskId, task] of Object.entries(this.tasks)) {
      tasksData[taskId] = task.toData();
    }

    return {
      matterId: this.matterId,
      clientName: this.clientName,
      tasks: tasksData,
      createdDate: this.createdDate.toISOString()
    };
  }

  static fromData(data: MatterData): Matter {
    const matter = new Matter(data.matterId, data.clientName);
    matter.createdDate = new Date(data.createdDate);

    // Clear default tasks and load from data
    matter.tasks = {};
    for (const [taskId, taskData] of Object.entries(data.tasks)) {
      matter.tasks[taskId] = Task.fromData(taskData);
    }

    return matter;
  }
}

export class LitigationTaskManager {
  private matters: Record<string, Matter>;

  constructor() {
    this.matters = {};
  }

  createMatter(matterId: string, clientName: string): Matter {
    if (this.matters[matterId]) {
      throw new Error(`Matter with ID '${matterId}' already exists`);
    }

    const matter = new Matter(matterId, clientName);
    this.matters[matterId] = matter;
    return matter;
  }

  getMatter(matterId: string): Matter | undefined {
    return this.matters[matterId];
  }

  triggerTask(matterId: string, taskId: string): string {
    const matter = this.matters[matterId];
    if (!matter) {
      return `Matter ${matterId} not found`;
    }

    return matter.executeTask(taskId);
  }

  createTask(
    matterId: string,
    taskId: string,
    name: string,
    dependencies: Dependency[] = []
  ): string {
    const matter = this.matters[matterId];
    if (!matter) {
      return `Matter ${matterId} not found`;
    }

    try {
      matter.addTask(taskId, name, dependencies);
      return `Task ${name} created successfully`;
    } catch (error) {
      return error instanceof Error ? error.message : 'Unknown error';
    }
  }

  addDependency(matterId: string, taskId: string, dependency: Dependency): string {
    const matter = this.matters[matterId];
    if (!matter) {
      return `Matter ${matterId} not found`;
    }

    try {
      matter.addDependencyToTask(taskId, dependency);
      return `Dependency added to task ${taskId}`;
    } catch (error) {
      return error instanceof Error ? error.message : 'Unknown error';
    }
  }

  getMatterStatus(matterId: string): MatterStatus | null {
    const matter = this.matters[matterId];
    if (!matter) {
      return null;
    }

    return {
      matterId: matter.matterId,
      clientName: matter.clientName,
      createdDate: matter.createdDate.toISOString(),
      tasks: matter.getTaskStatus()
    };
  }

  listMatters(): MatterSummary[] {
    return Object.values(this.matters).map(matter => ({
      matterId: matter.matterId,
      clientName: matter.clientName,
      createdDate: matter.createdDate.toISOString(),
      totalTasks: Object.keys(matter.tasks).length,
      completedTasks: Object.values(matter.tasks).filter(task => task.completed).length
    }));
  }

  // Methods for persistence (useful for serverless environments)
  exportData(): Record<string, MatterData> {
    const data: Record<string, MatterData> = {};
    for (const [matterId, matter] of Object.entries(this.matters)) {
      data[matterId] = matter.toData();
    }
    return data;
  }

  importData(data: Record<string, MatterData>): void {
    this.matters = {};
    for (const [matterId, matterData] of Object.entries(data)) {
      this.matters[matterId] = Matter.fromData(matterData);
    }
  }
}