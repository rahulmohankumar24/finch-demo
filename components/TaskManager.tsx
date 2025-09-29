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
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskId, setNewTaskId] = useState('');
  const [selectedDependencies, setSelectedDependencies] = useState<Dependency[]>([]);
  const [insertAfterTask, setInsertAfterTask] = useState('');

  const taskEntries = Object.entries(tasks);

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
    if (!newTaskName || !newTaskId) {
      alert('Please fill in task name and ID');
      return;
    }

    try {
      const response = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matterId,
          taskId: newTaskId,
          name: newTaskName,
          dependencies: selectedDependencies.filter(dep => dep.targetTaskId)
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message);
        setShowAddTask(false);
        setNewTaskName('');
        setNewTaskId('');
        setSelectedDependencies([]);
        setInsertAfterTask('');
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
    if (!newTaskName || !newTaskId || !insertAfterTask) {
      alert('Please fill in task name, ID, and select where to insert');
      return;
    }

    try {
      const response = await fetch('/api/tasks/insert-after', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matterId,
          newTaskId,
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
        setNewTaskId('');
        setSelectedDependencies([]);
        setInsertAfterTask('');
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

                {/* Action Button */}
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
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Task ID</label>
                <input
                  type="text"
                  value={newTaskId}
                  onChange={(e) => setNewTaskId(e.target.value)}
                  placeholder="e.g., review_medical_records"
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
            </div>

            {/* Task Insertion Options */}
            <div className="mb-6">
              <h4 className="font-medium mb-3">Insertion Options</h4>

              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="insertType"
                    value="custom"
                    defaultChecked
                    onChange={() => setInsertAfterTask('')}
                  />
                  <span>Custom Dependencies (manual setup)</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="insertType"
                    value="insert"
                    onChange={() => setSelectedDependencies([])}
                  />
                  <span>Insert After Existing Task (automatic dependency chain)</span>
                </label>
              </div>

              {insertAfterTask !== '' || document.querySelector('input[name="insertType"]:checked')?.value === 'insert' ? (
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
                        <input
                          type="number"
                          value={dep.timeDelayWeeks || ''}
                          onChange={(e) => updateDependency(index, 'timeDelayWeeks', parseInt(e.target.value))}
                          placeholder="Weeks"
                          className="w-20 p-2 border border-gray-300 rounded"
                        />
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
                onClick={() => setShowAddTask(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={insertAfterTask ? insertTaskAfter : createTask}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {insertAfterTask ? 'Insert Task' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}