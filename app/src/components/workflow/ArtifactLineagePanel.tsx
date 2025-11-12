/**
 * Artifact Lineage & Version History Panel
 * Visualize artifact relationships, versions, and dependencies
 */

import { useState } from 'react';
import { useWorkflowStore } from '@/store/workflowStore';
import type { VersionedArtifact, LineageNode } from '@/lib/workflow/artifactVersioning';
import { artifactVersionManager } from '@/lib/workflow/artifactVersioning';

export function ArtifactLineagePanel() {
  const {
    artifacts,
    getArtifactVersionHistory,
    getArtifactLineage,
  } = useWorkflowStore();

  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'history' | 'lineage'>('list');

  const artifactList = Object.values(artifacts).map(meta =>
    artifactVersionManager.getArtifact(meta.id)
  ).filter((art): art is VersionedArtifact => art !== null);

  const selectedArtifact = selectedArtifactId
    ? artifactVersionManager.getArtifact(selectedArtifactId)
    : null;

  const versionHistory = selectedArtifact
    ? getArtifactVersionHistory(selectedArtifact.path)
    : null;

  const lineage = selectedArtifactId
    ? getArtifactLineage(selectedArtifactId)
    : null;

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderLineageTree = (node: LineageNode, depth = 0) => {
    const indent = depth * 20;

    return (
      <div key={node.artifact.id} className="mb-2">
        <div
          style={{ marginLeft: `${indent}px` }}
          className={`p-2 rounded border ${
            node.artifact.id === selectedArtifactId
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
          } hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors`}
          onClick={() => setSelectedArtifactId(node.artifact.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {node.artifact.path}
                </span>
                <span className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                  v{node.artifact.version}
                </span>
                {node.artifact.critical && (
                  <span className="text-xs px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                    critical
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                <span>{node.artifact.contentType}</span>
                <span>{formatSize(node.artifact.size)}</span>
                <span>
                  {node.artifact.validationStatus === 'valid' && '✓ Valid'}
                  {node.artifact.validationStatus === 'invalid' && '✗ Invalid'}
                  {!node.artifact.validationStatus && '? Unknown'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Render children with increased depth */}
        {node.children.length > 0 && (
          <div className="mt-1 ml-2 border-l-2 border-gray-300 dark:border-gray-600 pl-2">
            {node.children.map(child => renderLineageTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Artifact Lineage
        </h2>

        {/* View mode toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded ${
              viewMode === 'list'
                ? 'text-white bg-blue-600'
                : 'text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded ${
              viewMode === 'history'
                ? 'text-white bg-blue-600'
                : 'text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
            }`}
            disabled={!selectedArtifact}
          >
            History
          </button>
          <button
            onClick={() => setViewMode('lineage')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded ${
              viewMode === 'lineage'
                ? 'text-white bg-blue-600'
                : 'text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
            }`}
            disabled={!selectedArtifact}
          >
            Tree
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === 'list' && (
          <div className="space-y-2">
            {artifactList.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="text-sm">No artifacts yet</p>
                <p className="text-xs mt-1">
                  Artifacts will appear here as agents create them
                </p>
              </div>
            ) : (
              artifactList.map(artifact => (
                <div
                  key={artifact.id}
                  onClick={() => setSelectedArtifactId(artifact.id)}
                  className={`p-3 rounded border cursor-pointer transition-colors ${
                    selectedArtifactId === artifact.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {artifact.path}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        v{artifact.version}
                      </span>
                      {artifact.critical && (
                        <span className="text-xs px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                          critical
                        </span>
                      )}
                    </div>
                  </div>

                  {artifact.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      {artifact.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <div>
                      <span className="font-medium">Type:</span> {artifact.contentType}
                    </div>
                    <div>
                      <span className="font-medium">Size:</span> {formatSize(artifact.size)}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>{' '}
                      {formatTimestamp(artifact.createdAt)}
                    </div>
                    <div>
                      <span className="font-medium">Hash:</span> {artifact.hash.substring(0, 8)}
                    </div>
                  </div>

                  {artifact.tags && artifact.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {artifact.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-block px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {artifact.validationStatus && (
                    <div className="mt-2">
                      {artifact.validationStatus === 'valid' && (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          ✓ Schema validation passed
                        </span>
                      )}
                      {artifact.validationStatus === 'invalid' && (
                        <div>
                          <span className="text-xs text-red-600 dark:text-red-400">
                            ✗ Schema validation failed
                          </span>
                          {artifact.validationErrors && (
                            <ul className="mt-1 ml-4 text-xs text-red-500 dark:text-red-400">
                              {artifact.validationErrors.map((err, i) => (
                                <li key={i}>• {err}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {viewMode === 'history' && versionHistory && (
          <div className="space-y-2">
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {versionHistory.path}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {versionHistory.totalVersions} version{versionHistory.totalVersions !== 1 ? 's' : ''}
                {' '} • Current: v{versionHistory.currentVersion}
              </div>
            </div>

            {versionHistory.versions.slice().reverse().map((artifact, index) => {
              const isLatest = index === 0;
              return (
                <div
                  key={artifact.id}
                  className={`p-3 rounded border ${
                    isLatest
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Version {artifact.version}
                      </span>
                      {isLatest && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200 rounded">
                          latest
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimestamp(artifact.createdAt)}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <div>Hash: {artifact.hash}</div>
                    <div>Size: {formatSize(artifact.size)}</div>
                    {artifact.previousVersion && (
                      <div>Updated from: v{artifact.version - 1}</div>
                    )}
                    {artifact.derivedFrom && artifact.derivedFrom.length > 0 && (
                      <div>Derived from: {artifact.derivedFrom.length} artifact(s)</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {viewMode === 'lineage' && lineage && (
          <div>
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Artifact Dependency Tree
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Click any artifact to view its details
              </div>
            </div>

            {renderLineageTree(lineage)}

            {lineage.parents.length === 0 && lineage.children.length === 0 && (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                This artifact has no dependencies or derived artifacts
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
