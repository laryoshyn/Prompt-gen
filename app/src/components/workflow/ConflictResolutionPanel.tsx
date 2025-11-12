import { useState } from 'react';
import { useWorkflowStore } from '@/store/workflowStore';
import type {
  ArtifactConflict,
  ConflictResolution,
  ResolutionStrategy,
  ConflictSeverity,
} from '@/lib/workflow/artifactConflictResolution';

/**
 * Conflict Resolution Panel
 *
 * Manage and resolve artifact conflicts in multi-agent workflows.
 *
 * Features:
 * - View all conflicts (resolved/unresolved)
 * - Conflict details with diff visualization
 * - Manual resolution editor
 * - Apply resolution strategies
 * - Resolution history
 * - Policy management
 */

interface ConflictResolutionPanelProps {
  onClose: () => void;
}

type ViewMode = 'conflicts' | 'details' | 'resolve' | 'history' | 'policies';

export function ConflictResolutionPanel({ onClose }: ConflictResolutionPanelProps) {
  const {
    getAllConflicts,
    getConflictResolutionStats,
    resolveArtifactConflict,
    calculateArtifactDiff,
  } = useWorkflowStore();

  const [viewMode, setViewMode] = useState<ViewMode>('conflicts');
  const [selectedConflict, setSelectedConflict] = useState<ArtifactConflict | null>(null);
  const [showResolvedFilter, setShowResolvedFilter] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<ResolutionStrategy>('auto-merge');
  const [manualContent, setManualContent] = useState('');

  const conflicts = getAllConflicts({
    resolved: showResolvedFilter ? true : false,
  });
  const stats = getConflictResolutionStats();

  const unresolvedConflicts = conflicts.filter(c => !c.resolved);
  const resolvedConflicts = conflicts.filter(c => c.resolved);

  const handleResolve = () => {
    if (!selectedConflict) return;

    try {
      const content = selectedStrategy === 'manual' ? JSON.parse(manualContent) : undefined;

      resolveArtifactConflict({
        conflictId: selectedConflict.id,
        strategy: selectedStrategy,
        resolvedBy: 'user',
        manualContent: content,
      });

      alert(`Conflict resolved using ${selectedStrategy} strategy`);
      setViewMode('conflicts');
      setSelectedConflict(null);
    } catch (error) {
      alert(`Error resolving conflict: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getSeverityColor = (severity: ConflictSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-red-50 to-orange-50">
        <div>
          <h2 className="text-xl font-bold text-gray-900">⚠️ Conflict Resolution</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage artifact conflicts in multi-agent workflows
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Close
        </button>
      </div>

      {/* Navigation */}
      <div className="flex border-b border-gray-200 bg-gray-50 px-6">
        <button
          onClick={() => setViewMode('conflicts')}
          className={`px-4 py-3 text-sm font-medium border-b-2 ${
            viewMode === 'conflicts'
              ? 'border-red-500 text-red-700'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          🔴 Conflicts ({unresolvedConflicts.length})
        </button>
        <button
          onClick={() => setViewMode('history')}
          className={`px-4 py-3 text-sm font-medium border-b-2 ${
            viewMode === 'history'
              ? 'border-red-500 text-red-700'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          📜 History ({resolvedConflicts.length})
        </button>
        <button
          onClick={() => setViewMode('policies')}
          className={`px-4 py-3 text-sm font-medium border-b-2 ${
            viewMode === 'policies'
              ? 'border-red-500 text-red-700'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          📋 Policies
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Conflicts View */}
        {viewMode === 'conflicts' && (
          <div className="space-y-4">
            {unresolvedConflicts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg mb-2">✅ No conflicts detected</p>
                <p className="text-sm">All artifacts are synchronized</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Unresolved Conflicts ({unresolvedConflicts.length})
                  </h3>
                </div>

                <div className="grid gap-4">
                  {unresolvedConflicts.map(conflict => (
                    <div
                      key={conflict.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-red-300 cursor-pointer"
                      onClick={() => {
                        setSelectedConflict(conflict);
                        setViewMode('details');
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{conflict.artifactPath}</h4>
                          <p className="text-xs text-gray-500 mt-1">
                            Detected: {new Date(conflict.detectedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <span
                            className={`px-2 py-1 text-xs rounded border ${getSeverityColor(
                              conflict.severity
                            )}`}
                          >
                            {conflict.severity.toUpperCase()}
                          </span>
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            {conflict.type}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-4 text-sm text-gray-600">
                        <span>📦 {conflict.conflictRegions.length} regions</span>
                        <span>📝 {conflict.affectedFields.length} fields</span>
                        <span>
                          🔄 v{conflict.currentVersion.version} ↔ v{conflict.incomingVersion.version}
                        </span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedConflict(conflict);
                            setViewMode('resolve');
                          }}
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Resolve Conflict
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Conflict Details View */}
        {viewMode === 'details' && selectedConflict && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Conflict Details</h3>
              <button
                onClick={() => setViewMode('conflicts')}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                ← Back to list
              </button>
            </div>

            {/* Overview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Overview</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Artifact:</span>
                  <span className="ml-2 font-mono text-gray-900">{selectedConflict.artifactPath}</span>
                </div>
                <div>
                  <span className="text-gray-600">Type:</span>
                  <span className="ml-2 text-gray-900">{selectedConflict.type}</span>
                </div>
                <div>
                  <span className="text-gray-600">Severity:</span>
                  <span
                    className={`ml-2 px-2 py-0.5 text-xs rounded ${getSeverityColor(
                      selectedConflict.severity
                    )}`}
                  >
                    {selectedConflict.severity.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Detected:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(selectedConflict.detectedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Versions */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Current Version</h4>
                <p className="text-xs text-gray-600 mb-2">
                  Version {selectedConflict.currentVersion.version} •{' '}
                  {selectedConflict.currentVersion.createdBy}
                </p>
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto max-h-60">
                  {JSON.stringify(selectedConflict.currentVersion.content, null, 2)}
                </pre>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Incoming Version</h4>
                <p className="text-xs text-gray-600 mb-2">
                  Version {selectedConflict.incomingVersion.version} •{' '}
                  {selectedConflict.incomingVersion.createdBy}
                </p>
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto max-h-60">
                  {JSON.stringify(selectedConflict.incomingVersion.content, null, 2)}
                </pre>
              </div>
            </div>

            {/* Conflict Regions */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">
                Conflict Regions ({selectedConflict.conflictRegions.length})
              </h4>
              <div className="space-y-3">
                {selectedConflict.conflictRegions.map(region => (
                  <div key={region.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      {region.type === 'field' ? `Field: ${region.location.field}` : 'Entire content'}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">CURRENT</p>
                        <pre className="text-xs bg-white p-2 rounded border border-gray-300 overflow-x-auto">
                          {region.current}
                        </pre>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">INCOMING</p>
                        <pre className="text-xs bg-white p-2 rounded border border-gray-300 overflow-x-auto">
                          {region.incoming}
                        </pre>
                      </div>
                    </div>
                    {region.base && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 mb-1">BASE (Common Ancestor)</p>
                        <pre className="text-xs bg-white p-2 rounded border border-gray-300 overflow-x-auto">
                          {region.base}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setViewMode('resolve')}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Resolve Conflict
              </button>
              <button
                onClick={() => setViewMode('conflicts')}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Resolve View */}
        {viewMode === 'resolve' && selectedConflict && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Resolve Conflict</h3>
              <button
                onClick={() => setViewMode('details')}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                ← Back to details
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Artifact:</strong> {selectedConflict.artifactPath}
              </p>
              <p className="text-sm text-yellow-800 mt-1">
                <strong>Severity:</strong> {selectedConflict.severity.toUpperCase()}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Resolution Strategy
              </label>
              <select
                value={selectedStrategy}
                onChange={e => setSelectedStrategy(e.target.value as ResolutionStrategy)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="auto-merge">Auto-Merge (Smart merge non-overlapping changes)</option>
                <option value="last-write-wins">Last Write Wins (Accept incoming version)</option>
                <option value="first-write-wins">First Write Wins (Keep current version)</option>
                <option value="merge-both">Merge Both (Combine both versions)</option>
                <option value="manual">Manual (Edit merged content)</option>
                <option value="agent-priority">Agent Priority (Use agent priority)</option>
              </select>
            </div>

            {selectedStrategy === 'manual' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Manual Content (JSON)
                </label>
                <textarea
                  value={manualContent}
                  onChange={e => setManualContent(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm"
                  placeholder={JSON.stringify(selectedConflict.currentVersion.content, null, 2)}
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleResolve}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Apply Resolution
              </button>
              <button
                onClick={() => setViewMode('details')}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* History View */}
        {viewMode === 'history' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Resolution History ({resolvedConflicts.length})
            </h3>

            {resolvedConflicts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg mb-2">No resolution history</p>
                <p className="text-sm">Resolved conflicts will appear here</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {resolvedConflicts.map(conflict => (
                  <div key={conflict.id} className="border border-gray-200 rounded-lg p-4 bg-green-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{conflict.artifactPath}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          Resolved: {conflict.resolvedAt ? new Date(conflict.resolvedAt).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                      <span className="px-2 py-1 text-xs bg-green-600 text-white rounded">
                        ✓ RESOLVED
                      </span>
                    </div>

                    {conflict.resolution && (
                      <div className="text-sm text-gray-600">
                        <p>
                          <strong>Strategy:</strong> {conflict.resolution.strategy}
                        </p>
                        <p>
                          <strong>Result:</strong> {conflict.resolution.result}
                        </p>
                        <p>
                          <strong>Resolved by:</strong> {conflict.resolution.resolvedBy}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Policies View */}
        {viewMode === 'policies' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Resolution Policies</h3>

            <div className="grid gap-4">
              {/* Conservative Policy */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">🛡️ Conservative</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Manual resolution for most conflicts, auto-resolve only trivial ones
                </p>
                <div className="bg-gray-50 rounded p-3 text-xs">
                  <p>• Low severity → Auto-merge</p>
                  <p>• Metadata conflicts → Last-write-wins</p>
                  <p>• All others → Manual</p>
                  <p>• Notifications: Enabled</p>
                </div>
              </div>

              {/* Aggressive Policy */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">⚡ Aggressive</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Auto-resolve conflicts when possible, use last-write-wins as fallback
                </p>
                <div className="bg-gray-50 rounded p-3 text-xs">
                  <p>• Schema/Type conflicts → Manual</p>
                  <p>• Critical severity → Manual</p>
                  <p>• Below high severity → Auto-merge</p>
                  <p>• Notifications: Disabled</p>
                </div>
              </div>

              {/* Last Write Wins Policy */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">🔄 Last Write Wins</h4>
                <p className="text-sm text-gray-600 mb-3">Always accept the latest version</p>
                <div className="bg-gray-50 rounded p-3 text-xs">
                  <p>• All conflicts → Last-write-wins</p>
                  <p>• No manual intervention</p>
                  <p>• Notifications: Disabled</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-5 gap-4 text-center text-sm">
          <div>
            <p className="text-gray-600">Total</p>
            <p className="text-lg font-semibold text-gray-900">{stats.totalConflicts}</p>
          </div>
          <div>
            <p className="text-gray-600">Unresolved</p>
            <p className="text-lg font-semibold text-red-600">{stats.unresolvedConflicts}</p>
          </div>
          <div>
            <p className="text-gray-600">Resolved</p>
            <p className="text-lg font-semibold text-green-600">{stats.resolvedConflicts}</p>
          </div>
          <div>
            <p className="text-gray-600">Critical</p>
            <p className="text-lg font-semibold text-red-600">
              {stats.conflictsBySeverity?.critical || 0}
            </p>
          </div>
          <div>
            <p className="text-gray-600">High</p>
            <p className="text-lg font-semibold text-orange-600">
              {stats.conflictsBySeverity?.high || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
