'use client';

import React, { useState, useEffect } from 'react';
import { ClientData } from '@/lib/storage';
import { MatterSummary } from '@/lib/litigation-system';
import StandaloneTaskManager from './StandaloneTaskManager';

interface ClientMattersViewProps {
  client: ClientData;
  onBack: () => void;
}

export function ClientMattersView({ client, onBack }: ClientMattersViewProps) {
  const [matters, setMatters] = useState<MatterSummary[]>([]);
  const [selectedMatter, setSelectedMatter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateMatter, setShowCreateMatter] = useState(false);
  const [newMatterName, setNewMatterName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadMatters();
  }, [client.client_id]);

  const loadMatters = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/clients/${client.client_id}/matters`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      // Convert matters to MatterSummary format
      const matterSummaries: MatterSummary[] = data.matters.map((matter: any) => ({
        matterId: matter.matter_id,
        matterName: matter.matter_name,
        clientId: matter.client_id,
        clientName: client.name,
        createdDate: matter.created_date,
        totalTasks: 0, // Will be updated when viewing individual matter
        completedTasks: 0
      }));

      setMatters(matterSummaries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matters');
    } finally {
      setLoading(false);
    }
  };

  const createMatter = async () => {
    if (!newMatterName.trim()) return;

    try {
      setCreating(true);
      // Generate a unique UUID for the matter
      const matterId = crypto.randomUUID();

      const response = await fetch(`/api/clients/${client.client_id}/matters/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matterId,
          matterName: newMatterName.trim(),
          clientName: client.name
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      // Add new matter to list
      const newMatter: MatterSummary = {
        matterId: data.matter.matterId,
        matterName: data.matter.matterName,
        clientId: data.matter.clientId,
        clientName: data.matter.clientName,
        createdDate: data.matter.createdDate,
        totalTasks: data.matter.totalTasks,
        completedTasks: data.matter.completedTasks
      };

      setMatters(prev => [newMatter, ...prev]);
      setNewMatterName('');
      setShowCreateMatter(false);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create matter');
    } finally {
      setCreating(false);
    }
  };

  if (selectedMatter) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => setSelectedMatter(null)}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to {client.name}
        </button>
        <StandaloneTaskManager matterId={selectedMatter} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading matters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Clients
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
            <p className="text-gray-600">Matters and Cases</p>
            {client.email && (
              <p className="text-sm text-gray-500 mt-1">{client.email}</p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Create Matter Section */}
      <div className="mb-6">
        {!showCreateMatter ? (
          <button
            onClick={() => setShowCreateMatter(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create New Matter
          </button>
        ) : (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-3">Create New Matter</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newMatterName}
                onChange={(e) => setNewMatterName(e.target.value)}
                placeholder="Enter matter name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && createMatter()}
              />
              <button
                onClick={createMatter}
                disabled={creating || !newMatterName.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setShowCreateMatter(false);
                  setNewMatterName('');
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Matters List */}
      {matters.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No matters found</h3>
          <p className="text-gray-600 mb-4">Create your first matter for this client</p>
          <button
            onClick={() => setShowCreateMatter(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create First Matter
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {matters.map((matter) => (
            <div
              key={matter.matterId}
              onClick={() => setSelectedMatter(matter.matterId)}
              className="border border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {matter.matterName || matter.matterId}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Created: {new Date(matter.createdDate).toLocaleDateString()}
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                    <span>Tasks: {matter.totalTasks}</span>
                    <span>Completed: {matter.completedTasks}</span>
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}