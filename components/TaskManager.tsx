'use client';

import { useState } from 'react';
import { DependencyType } from '@/lib/litigation-system';

interface Dependency {
  dependencyType: string;
  targetTaskId: string;
  timeDelayWeeks?: number;
}

interface TaskStatus {
  name: string;
  completed: boolean;
  completionDate?: string;
  dependenciesMet: boolean;
  canExecute: boolean;
}

interface TaskDependency {
  type: string;
  targetTask: string;
  targetTaskName: string;
  timeDelayWeeks?: number;
  description: string;
  isMet: boolean;
}

interface TaskManagerProps {
  matterId: string;
  tasks: Record<string, TaskStatus>;
  dependencies?: Record<string, TaskDependency[]>;
  onTaskExecute: (taskId: string) => void;
  onRefresh: () => void;
}

export default function TaskManager({ matterId, tasks, dependencies = {}, onTaskExecute, onRefresh }: TaskManagerProps) {
  const [showAddTask, setShowAddTask] = useState(false);
  const [showEditTask, setShowEditTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [selectedDependencies, setSelectedDependencies] = useState<Dependency[]>([]);
  const [insertAfterTask, setInsertAfterTask] = useState('');
  const [insertMode, setInsertMode] = useState<'custom' | 'insert'>('custom');

  const taskEntries = Object.entries(tasks);

  const generateTaskId = (name: string): string => {
    // Convert name to snake_case and add random suffix for uniqueness
    const baseId = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_');

    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${baseId}_${randomSuffix}`;
  };

  const addDependency = () => {
    setSelectedDependencies([...selectedDependencies, {
      dependencyType: DependencyType.TASK_COMPLETION,
      targetTaskId: '',
      timeDelayWeeks: undefined
    }]);
  };

  const updateDependency = (index: number, field: string, value: any) => {
    const updated = [...selectedDependencies];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedDependencies(updated);
  };

  const removeDependency = (index: number) => {
    setSelectedDependencies(selectedDependencies.filter((_, i) => i !== index));
  };

  const createTask = async () => {
    if (!newTaskName) {
      alert('Please fill in task name');
      return;
    }

    const generatedTaskId = generateTaskId(newTaskName);

    try {
      const response = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matterId,
          taskId: generatedTaskId,
          name: newTaskName,
          dependencies: selectedDependencies.filter(dep => dep.targetTaskId)
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message);
        setShowAddTask(false);
        setNewTaskName('');
        setSelectedDependencies([]);
        setInsertAfterTask('');
        setInsertMode('custom');
        onRefresh();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task');
    }
  };

  const insertTaskAfter = async () => {
    if (!newTaskName || !insertAfterTask) {
      alert('Please fill in task name and select where to insert');
      return;
    }

    const generatedTaskId = generateTaskId(newTaskName);

    try {
      const response = await fetch('/api/tasks/insert-after', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matterId,
          newTaskId: generatedTaskId,
          newTaskName,
          insertAfterTaskId: insertAfterTask
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message);
        if (data.updatedDependencies.count > 0) {
          alert(`Updated ${data.updatedDependencies.count} tasks to depend on the new task`);
        }
        setShowAddTask(false);
        setNewTaskName('');
        setSelectedDependencies([]);
        setInsertAfterTask('');
        setInsertMode('custom');
        onRefresh();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Failed to insert task:', error);
      alert('Failed to insert task');
    }
  };

  const getTaskDependencies = (taskId: string): TaskDependency[] => {
    return dependencies[taskId] || [];
  };

  const openEditTask = (taskId: string) => {
    const taskDeps = getTaskDependencies(taskId);

    // Convert TaskDependency[] to Dependency[] for editing
    const editableDeps: Dependency[] = taskDeps.map(dep => ({
      dependencyType: dep.type as any,
      targetTaskId: dep.targetTask,
      timeDelayWeeks: dep.timeDelayWeeks
    }));

    setEditingTaskId(taskId);
    setSelectedDependencies(editableDeps);
    setShowEditTask(true);
  };

  const saveTaskDependencies = async () => {
    if (!editingTaskId) return;

    try {
      const response = await fetch('/api/tasks/edit-dependencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matterId,
          taskId: editingTaskId,
          dependencies: selectedDependencies.filter(dep => dep.targetTaskId)
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message);
        setShowEditTask(false);
        setEditingTaskId('');
        setSelectedDependencies([]);
        onRefresh();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Failed to update task dependencies:', error);
      alert('Failed to update task dependencies');
    }
  };

  return (
    <div className="space-y-6">
      {/* Task List with Dependencies */}
      <div className="space-y-4">
        {taskEntries.map(([taskId, task]) => {
          const taskDeps = getTaskDependencies(taskId);

          return (
            <div
              key={taskId}
              className={`p-4 border rounded-lg ${
                task.completed
                  ? 'border-green-300 bg-green-50'
                  : task.canExecute
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-300 bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-lg ${task.completed ? 'text-green-600' : 'text-gray-600'}`}>
                      {task.completed ? '✓' : '○'}
                    </span>
                    <div>
                      <h3 className="font-medium text-lg">{task.name}</h3>
                      <div className="text-sm text-gray-500">ID: {taskId}</div>
                    </div>
                  </div>

                  {/* Dependency Information */}
                  {taskDeps.length > 0 && (
                    <div className="ml-8 mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Dependencies:</div>
                      <ul className="text-sm space-y-1">
                        {taskDeps.map((dep, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${dep.isMet ? 'bg-green-500' : 'bg-red-400'}`}></span>
                            <span className={dep.isMet ? 'text-green-600 line-through' : 'text-gray-600'}>
                              {dep.description}
                            </span>
                            {dep.isMet && (
                              <span className="text-green-600 text-xs">✓</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Status Information */}
                  <div className="ml-8 text-sm">
                    {task.completed && task.completionDate && (
                      <span className="text-green-600">
                        Completed: {new Date(task.completionDate).toLocaleDateString()}
                      </span>
                    )}
                    {!task.completed && (
                      <span className={task.dependenciesMet ? 'text-blue-600' : 'text-red-600'}>
                        Dependencies: {task.dependenciesMet ? '✓ Ready' : '✗ Waiting'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditTask(taskId)}
                    className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
                  >
                    Edit Dependencies
                  </button>
                  {task.canExecute && (
                    <button
                      onClick={() => onTaskExecute(taskId)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Execute
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Task Button */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowAddTask(true)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
        >
          + Add Custom Task
        </button>
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Add New Task</h3>

            {/* Basic Task Info */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Task Name</label>
                <input
                  type="text"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="e.g., Review Medical Records"
                  className="w-full p-2 border border-gray-300 rounded"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Task ID will be automatically generated based on the name
                </p>
              </div>
            </div>

            {/* Task Creation Options */}
            <div className="mb-6">
              <h4 className="font-medium mb-3">How do you want to add this task?</h4>

              <div className="space-y-4">
                <label className="flex items-start gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="insertType"
                    value="custom"
                    checked={insertMode === 'custom'}
                    onChange={() => {
                      setInsertMode('custom');
                      setInsertAfterTask('');
                    }}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">Custom Dependencies</div>
                    <div className="text-sm text-gray-600 mt-1">
                      <strong>Manual Setup:</strong> You choose exactly which tasks this depends on.
                      <br />• Perfect for tasks that need specific requirements
                      <br />• Can depend on multiple tasks
                      <br />• Can set time-based delays (e.g., "2 weeks after X")
                      <br />• <em>Example: "Final Review" depends on both "Draft Complete" AND "Client Approval"</em>
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="insertType"
                    value="insert"
                    checked={insertMode === 'insert'}
                    onChange={() => {
                      setInsertMode('insert');
                      setSelectedDependencies([]);
                    }}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">Insert Into Workflow</div>
                    <div className="text-sm text-gray-600 mt-1">
                      <strong>Automatic Chain Update:</strong> Insert your task between two existing tasks.
                      <br />• System automatically updates dependency chains
                      <br />• Perfect for adding steps in the middle of a process
                      <br />• <em>Example: Current flow is A → C, insert B after A → becomes A → B → C</em>
                      <br />• <span className="text-blue-600">Existing tasks that depended on A will now depend on B</span>
                    </div>
                  </div>
                </label>
              </div>

              {insertMode === 'insert' ? (
                <div className="mt-3">
                  <label className="block text-sm font-medium mb-1">Insert After:</label>
                  <select
                    value={insertAfterTask}
                    onChange={(e) => setInsertAfterTask(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                  >
                    <option value="">Select a task...</option>
                    {taskEntries.map(([taskId, task]) => (
                      <option key={taskId} value={taskId}>
                        {task.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-600 mt-1">
                    This will make your new task depend on the selected task, and update other tasks to depend on your new task instead.
                  </p>
                </div>
              ) : (
                /* Custom Dependencies */
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Dependencies</h4>
                    <button
                      onClick={addDependency}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      + Add Dependency
                    </button>
                  </div>

                  {selectedDependencies.map((dep, index) => (
                    <div key={index} className="flex gap-3 items-center mb-3 p-3 border rounded">
                      <select
                        value={dep.dependencyType}
                        onChange={(e) => updateDependency(index, 'dependencyType', e.target.value)}
                        className="p-2 border border-gray-300 rounded"
                      >
                        <option value={DependencyType.TASK_COMPLETION}>Task Completion</option>
                        <option value={DependencyType.TIME_BASED}>Time Based</option>
                      </select>

                      <select
                        value={dep.targetTaskId}
                        onChange={(e) => updateDependency(index, 'targetTaskId', e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded"
                      >
                        <option value="">Select task...</option>
                        {taskEntries.map(([taskId, task]) => (
                          <option key={taskId} value={taskId}>
                            {task.name}
                          </option>
                        ))}
                      </select>

                      {dep.dependencyType === DependencyType.TIME_BASED && (
                        <div className="flex gap-2 items-center">
                          <select
                            value={dep.timeDelayWeeks || ''}
                            onChange={(e) => updateDependency(index, 'timeDelayWeeks', parseInt(e.target.value))}
                            className="p-2 border border-gray-300 rounded"
                          >
                            <option value="">Select time delay...</option>
                            <option value="1">1 week</option>
                            <option value="2">2 weeks</option>
                            <option value="3">3 weeks</option>
                            <option value="4">4 weeks (1 month)</option>
                            <option value="6">6 weeks</option>
                            <option value="8">8 weeks (2 months)</option>
                            <option value="12">12 weeks (3 months)</option>
                            <option value="16">16 weeks (4 months)</option>
                            <option value="24">24 weeks (6 months)</option>
                            <option value="52">52 weeks (1 year)</option>
                          </select>
                          <span className="text-sm text-gray-500">after completion</span>
                        </div>
                      )}

                      <button
                        onClick={() => removeDependency(index)}
                        className="px-2 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddTask(false);
                  setNewTaskName('');
                  setInsertMode('custom');
                  setInsertAfterTask('');
                  setSelectedDependencies([]);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={insertMode === 'insert' ? insertTaskAfter : createTask}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {insertMode === 'insert' ? 'Insert Task' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Dependencies Modal */}
      {showEditTask && editingTaskId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              Edit Dependencies for "{tasks[editingTaskId]?.name}"
            </h3>

            <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
              <div className="text-sm text-blue-800">
                <strong>💡 Tip:</strong> You can now make existing tasks depend on newly created tasks!
                <br />• Add dependencies on any task in this matter
                <br />• Remove dependencies that are no longer needed
                <br />• Set time-based delays for compliance requirements
              </div>
            </div>

            {/* Current Dependencies */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium">Dependencies</h4>
                <button
                  onClick={addDependency}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  + Add Dependency
                </button>
              </div>

              {selectedDependencies.length === 0 ? (
                <div className="text-gray-500 text-sm p-3 border rounded bg-gray-50">
                  No dependencies. This task can be executed immediately.
                </div>
              ) : (
                selectedDependencies.map((dep, index) => (
                  <div key={index} className="flex gap-3 items-center mb-3 p-3 border rounded">
                    <select
                      value={dep.dependencyType}
                      onChange={(e) => updateDependency(index, 'dependencyType', e.target.value)}
                      className="p-2 border border-gray-300 rounded"
                    >
                      <option value={DependencyType.TASK_COMPLETION}>Task Completion</option>
                      <option value={DependencyType.TIME_BASED}>Time Based</option>
                    </select>

                    <select
                      value={dep.targetTaskId}
                      onChange={(e) => updateDependency(index, 'targetTaskId', e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded"
                    >
                      <option value="">Select task...</option>
                      {taskEntries
                        .filter(([taskId]) => taskId !== editingTaskId) // Don't allow self-dependency
                        .map(([taskId, task]) => (
                          <option key={taskId} value={taskId}>
                            {task.name}
                          </option>
                        ))}
                    </select>

                    {dep.dependencyType === DependencyType.TIME_BASED && (
                      <div className="flex gap-2 items-center">
                        <select
                          value={dep.timeDelayWeeks || ''}
                          onChange={(e) => updateDependency(index, 'timeDelayWeeks', parseInt(e.target.value))}
                          className="p-2 border border-gray-300 rounded"
                        >
                          <option value="">Select time delay...</option>
                          <option value="1">1 week</option>
                          <option value="2">2 weeks</option>
                          <option value="3">3 weeks</option>
                          <option value="4">4 weeks (1 month)</option>
                          <option value="6">6 weeks</option>
                          <option value="8">8 weeks (2 months)</option>
                          <option value="12">12 weeks (3 months)</option>
                          <option value="16">16 weeks (4 months)</option>
                          <option value="24">24 weeks (6 months)</option>
                          <option value="52">52 weeks (1 year)</option>
                        </select>
                        <span className="text-sm text-gray-500">after completion</span>
                      </div>
                    )}

                    <button
                      onClick={() => removeDependency(index)}
                      className="px-2 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditTask(false);
                  setEditingTaskId('');
                  setSelectedDependencies([]);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={saveTaskDependencies}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Dependencies
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}