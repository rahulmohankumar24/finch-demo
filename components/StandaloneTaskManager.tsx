'use client';

import { useState, useEffect } from 'react';
import TaskManager from './TaskManager';

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

interface DetailedMatterStatus {
  matter: {
    matterId: string;
    clientName: string;
  };
  dependencies: Record<string, TaskDependency[]>;
  tasks: Record<string, TaskStatus>;
}

interface StandaloneTaskManagerProps {
  matterId: string;
}

export default function StandaloneTaskManager({ matterId }: StandaloneTaskManagerProps) {
  const [matterStatus, setMatterStatus] = useState<DetailedMatterStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMatterStatus();
  }, [matterId]);

  const fetchMatterStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/matters/${matterId}/dependencies`);
      const data = await response.json();

      if (data.success) {
        setMatterStatus(data);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch matter status');
    } finally {
      setLoading(false);
    }
  };

  const executeTask = async (taskId: string) => {
    try {
      const response = await fetch('/api/tasks/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matterId, taskId })
      });

      const data = await response.json();
      if (data.success) {
        alert(data.result);
        // Refresh if task was executed
        if (data.executed) {
          await fetchMatterStatus();
        }
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error('Failed to execute task:', err);
      alert('Failed to execute task');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading tasks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong>Error:</strong> {error}
        <button
          onClick={fetchMatterStatus}
          className="ml-4 bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!matterStatus) {
    return (
      <div className="text-center text-gray-500 p-8">
        Matter not found
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold text-gray-900">
          {matterStatus.matter.matterId}
        </h2>
        <p className="text-gray-600">{matterStatus.matter.clientName}</p>
      </div>

      <TaskManager
        matterId={matterId}
        tasks={matterStatus.tasks}
        dependencies={matterStatus.dependencies}
        onTaskExecute={executeTask}
        onRefresh={fetchMatterStatus}
      />
    </div>
  );
}