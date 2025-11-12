/**
 * Checkpoint Management Panel
 * UI for viewing, creating, restoring, and managing workflow checkpoints
 */

import { useState } from 'react';
import { useWorkflowStore } from '@/store/workflowStore';
import type { Checkpoint } from '@/lib/workflow/checkpointing';

export function CheckpointPanel() {
  const {
    checkpoints,
    autoCheckpointEnabled,
    createCheckpoint,
    restoreFromCheckpoint,
    deleteCheckpoint,
    clearCheckpoints,
    toggleAutoCheckpoint,
    exportCheckpoint,
    importCheckpoint,
  } = useWorkflowStore();

  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [showImportForm, setShowImportForm] = useState(false);

  const handleCreateCheckpoint = () => {
    if (!description.trim()) {
      alert('Please enter a checkpoint description');
      return;
    }

    const tagArray = tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    createCheckpoint(description, tagArray.length > 0 ? tagArray : undefined);
    setDescription('');
    setTags('');
    setShowCreateForm(false);
  };

  const handleRestore = (checkpointId: string) => {
    if (confirm('Restore this checkpoint? Current unsaved changes will be lost.')) {
      const success = restoreFromCheckpoint(checkpointId);
      if (success) {
        alert('Checkpoint restored successfully!');
      } else {
        alert('Failed to restore checkpoint');
      }
    }
  };

  const handleDelete = (checkpointId: string) => {
    if (confirm('Delete this checkpoint?')) {
      deleteCheckpoint(checkpointId);
    }
  };

  const handleExport = (checkpointId: string) => {
    const json = exportCheckpoint(checkpointId);
    if (json) {
      // Create download link
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${checkpointId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = () => {
    if (!importJson.trim()) {
      alert('Please paste checkpoint JSON');
      return;
    }

    const success = importCheckpoint(importJson);
    if (success) {
      alert('Checkpoint imported successfully!');
      setImportJson('');
      setShowImportForm(false);
    } else {
      alert('Failed to import checkpoint. Invalid JSON format.');
    }
  };

  const handleClearAll = () => {
    if (confirm('Delete all checkpoints for this workflow?')) {
      clearCheckpoints();
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatTags = (checkpoint: Checkpoint) => {
    if (!checkpoint.tags || checkpoint.tags.length === 0) return null;
    return checkpoint.tags.map(tag => (
      <span
        key={tag}
        className="inline-block px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      >
        {tag}
      </span>
    ));
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Checkpoints
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {checkpoints.length} saved
          </span>
        </div>

        {/* Auto-checkpoint toggle */}
        <div className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            id="auto-checkpoint"
            checked={autoCheckpointEnabled}
            onChange={toggleAutoCheckpoint}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label
            htmlFor="auto-checkpoint"
            className="text-sm text-gray-700 dark:text-gray-300"
          >
            Auto-checkpoint at agent boundaries
          </label>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Create Checkpoint
          </button>
          <button
            onClick={() => setShowImportForm(!showImportForm)}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Import
          </button>
          {checkpoints.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Create checkpoint form */}
        {showCreateForm && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded space-y-2">
            <input
              type="text"
              placeholder="Checkpoint description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <input
              type="text"
              placeholder="Tags (comma-separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateCheckpoint}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Import checkpoint form */}
        {showImportForm && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded space-y-2">
            <textarea
              placeholder="Paste checkpoint JSON here..."
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <div className="flex gap-2">
              <button
                onClick={handleImport}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                Import
              </button>
              <button
                onClick={() => setShowImportForm(false)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Checkpoint list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {checkpoints.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-sm">No checkpoints yet</p>
            <p className="text-xs mt-1">
              Checkpoints save workflow state for recovery
            </p>
          </div>
        ) : (
          checkpoints
            .slice()
            .reverse()
            .map((checkpoint) => (
              <div
                key={checkpoint.id}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
              >
                {/* Checkpoint header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {checkpoint.description || 'Unnamed checkpoint'}
                      </h3>
                      {checkpoint.automatic && (
                        <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded">
                          auto
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimestamp(checkpoint.timestamp)}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                {checkpoint.tags && checkpoint.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {formatTags(checkpoint)}
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-2 text-xs text-gray-600 dark:text-gray-400">
                  <div>
                    <span className="font-medium">
                      {checkpoint.executionHistory.length}
                    </span>{' '}
                    executed
                  </div>
                  <div>
                    <span className="font-medium">{checkpoint.pendingAgents.length}</span>{' '}
                    pending
                  </div>
                  <div>
                    <span className="font-medium">
                      {Object.keys(checkpoint.artifacts).length}
                    </span>{' '}
                    artifacts
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRestore(checkpoint.id)}
                    className="flex-1 px-2 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => handleExport(checkpoint.id)}
                    className="px-2 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
                  >
                    Export
                  </button>
                  <button
                    onClick={() => handleDelete(checkpoint.id)}
                    className="px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
