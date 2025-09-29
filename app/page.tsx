'use client';

import { useState, useEffect } from 'react';
import { DependencyType } from '@/lib/litigation-system';

interface Matter {
  matterId: string;
  clientName: string;
  createdDate: string;
  totalTasks: number;
  completedTasks: number;
}

interface TaskStatus {
  name: string;
  completed: boolean;
  completionDate?: string;
  dependenciesMet: boolean;
  canExecute: boolean;
}

interface MatterStatus {
  matterId: string;
  clientName: string;
  createdDate: string;
  tasks: Record<string, TaskStatus>;
}

export default function Home() {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [selectedMatter, setSelectedMatter] = useState<MatterStatus | null>(null);
  const [newMatterId, setNewMatterId] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMatters();
  }, []);

  const fetchMatters = async () => {
    try {
      const response = await fetch('/api/matters');
      const data = await response.json();
      if (data.success) {
        setMatters(data.matters);
      }
    } catch (error) {
      console.error('Failed to fetch matters:', error);
    }
  };

  const fetchMatterStatus = async (matterId: string) => {
    try {
      const response = await fetch(`/api/matters/${matterId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedMatter(data.matter);
      }
    } catch (error) {
      console.error('Failed to fetch matter status:', error);
    }
  };

  const createMatter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatterId || !newClientName) return;

    setLoading(true);
    try {
      const response = await fetch('/api/matters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matterId: newMatterId, clientName: newClientName })
      });

      const data = await response.json();
      if (data.success) {
        setNewMatterId('');
        setNewClientName('');
        await fetchMatters();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Failed to create matter:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeTask = async (matterId: string, taskId: string) => {
    try {
      const response = await fetch('/api/tasks/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matterId, taskId })
      });

      const data = await response.json();
      if (data.success) {
        alert(data.result);
        await fetchMatterStatus(matterId);
        await fetchMatters();
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Failed to execute task:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">Pre-Litigation Task Manager</h1>

      {/* Create New Matter */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Create New Matter</h2>
        <form onSubmit={createMatter} className="flex gap-4">
          <input
            type="text"
            placeholder="Matter ID"
            value={newMatterId}
            onChange={(e) => setNewMatterId(e.target.value)}
            className="flex-1 p-2 border border-gray-300 rounded"
            required
          />
          <input
            type="text"
            placeholder="Client Name"
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
            className="flex-1 p-2 border border-gray-300 rounded"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Matter'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Matters List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">All Matters</h2>
          {matters.length === 0 ? (
            <p className="text-gray-500">No matters found. Create one above.</p>
          ) : (
            <div className="space-y-3">
              {matters.map((matter) => (
                <div
                  key={matter.matterId}
                  className="p-4 border border-gray-200 rounded cursor-pointer hover:bg-gray-50"
                  onClick={() => fetchMatterStatus(matter.matterId)}
                >
                  <div className="font-medium">{matter.matterId}</div>
                  <div className="text-sm text-gray-600">{matter.clientName}</div>
                  <div className="text-sm text-gray-500">
                    {matter.completedTasks}/{matter.totalTasks} tasks completed
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Matter Tasks */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">
            {selectedMatter ? `Tasks for ${selectedMatter.matterId}` : 'Select a Matter'}
          </h2>

          {selectedMatter ? (
            <div>
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <div className="font-medium">{selectedMatter.clientName}</div>
                <div className="text-sm text-gray-600">
                  Created: {new Date(selectedMatter.createdDate).toLocaleDateString()}
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(selectedMatter.tasks).map(([taskId, task]) => (
                  <div
                    key={taskId}
                    className={`p-3 border rounded ${
                      task.completed
                        ? 'border-green-300 bg-green-50'
                        : task.canExecute
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          <span className={task.completed ? 'text-green-600' : 'text-gray-600'}>
                            {task.completed ? '✓' : '○'}
                          </span>
                          {task.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {task.completed && task.completionDate && (
                            <span>Completed: {new Date(task.completionDate).toLocaleDateString()}</span>
                          )}
                          {!task.completed && (
                            <span>
                              Dependencies met: {task.dependenciesMet ? '✓' : '✗'}
                            </span>
                          )}
                        </div>
                      </div>

                      {task.canExecute && (
                        <button
                          onClick={() => executeTask(selectedMatter.matterId, taskId)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Execute
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Click on a matter to view its tasks.</p>
          )}
        </div>
      </div>

      {/* API Documentation */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3">API Endpoints</h3>
        <div className="text-sm space-y-2">
          <div><code className="bg-gray-200 px-2 py-1 rounded">GET /api/matters</code> - List all matters</div>
          <div><code className="bg-gray-200 px-2 py-1 rounded">POST /api/matters</code> - Create new matter</div>
          <div><code className="bg-gray-200 px-2 py-1 rounded">GET /api/matters/[id]</code> - Get matter status</div>
          <div><code className="bg-gray-200 px-2 py-1 rounded">POST /api/tasks/execute</code> - Execute task</div>
          <div><code className="bg-gray-200 px-2 py-1 rounded">POST /api/tasks/create</code> - Create custom task</div>
          <div><code className="bg-gray-200 px-2 py-1 rounded">POST /api/tasks/add-dependency</code> - Add dependency</div>
        </div>
      </div>
    </div>
  );
}