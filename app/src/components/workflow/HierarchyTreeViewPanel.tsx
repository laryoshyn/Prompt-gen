/**
 * Hierarchy Tree View Panel
 *
 * Displays all hierarchical teams currently on the canvas
 * Features:
 * - Tree visualization of team structures
 * - Edit existing hierarchies
 * - Delete hierarchies from canvas
 * - View detailed information
 */

import { useState } from 'react';
import type { WorkflowNode } from '@/types/workflow';

interface HierarchyMetadata {
  hierarchyId: string;
  hierarchyName: string;
  teamName: string;
  rootNodeId: string;
  createdAt: number;
  nodeCount: number;
  depth: number;
}

interface HierarchyTreeViewPanelProps {
  nodes: WorkflowNode[];
  onClose: () => void;
  onEditHierarchy: (hierarchyId: string) => void;
  onDeleteHierarchy: (hierarchyId: string) => void;
  onSelectNode: (nodeId: string) => void;
}

export function HierarchyTreeViewPanel({
  nodes,
  onClose,
  onEditHierarchy,
  onDeleteHierarchy,
  onSelectNode,
}: HierarchyTreeViewPanelProps) {
  const [selectedHierarchy, setSelectedHierarchy] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Extract hierarchies from nodes
  const getHierarchies = (): Map<string, HierarchyMetadata> => {
    const hierarchies = new Map<string, HierarchyMetadata>();

    nodes.forEach(node => {
      const nodeData = node.data as any;
      if (nodeData.hierarchyId) {
        if (!hierarchies.has(nodeData.hierarchyId)) {
          hierarchies.set(nodeData.hierarchyId, {
            hierarchyId: nodeData.hierarchyId,
            hierarchyName: nodeData.hierarchyName || 'Unnamed Hierarchy',
            teamName: nodeData.teamName || 'Unnamed Team',
            rootNodeId: nodeData.isHierarchyRoot ? node.id : '',
            createdAt: nodeData.hierarchyCreatedAt || Date.now(),
            nodeCount: 0,
            depth: 0,
          });
        }

        const hierarchy = hierarchies.get(nodeData.hierarchyId)!;
        hierarchy.nodeCount++;

        if (nodeData.hierarchyDepth !== undefined) {
          hierarchy.depth = Math.max(hierarchy.depth, nodeData.hierarchyDepth);
        }

        if (nodeData.isHierarchyRoot) {
          hierarchy.rootNodeId = node.id;
        }
      }
    });

    return hierarchies;
  };

  // Get nodes for a specific hierarchy
  const getHierarchyNodes = (hierarchyId: string): WorkflowNode[] => {
    return nodes.filter(node => (node.data as any).hierarchyId === hierarchyId);
  };

  // Build tree structure for a hierarchy
  const buildTreeStructure = (hierarchyId: string) => {
    const hierarchyNodes = getHierarchyNodes(hierarchyId);
    const rootNode = hierarchyNodes.find(node => (node.data as any).isHierarchyRoot);

    if (!rootNode) return null;

    interface TreeNode {
      node: WorkflowNode;
      children: TreeNode[];
      level: number;
    }

    const buildTree = (nodeId: string, level: number): TreeNode | null => {
      const node = hierarchyNodes.find(n => n.id === nodeId);
      if (!node) return null;

      const nodeData = node.data as any;
      const childIds = nodeData.hierarchyChildren || [];

      return {
        node,
        children: childIds.map((id: string) => buildTree(id, level + 1)).filter(Boolean),
        level,
      };
    };

    return buildTree(rootNode.id, 0);
  };

  // Render tree node recursively
  const renderTreeNode = (treeNode: any, hierarchyId: string) => {
    const { node, children, level } = treeNode;
    const nodeData = node.data as any;
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = children.length > 0;

    const toggleExpand = () => {
      const newExpanded = new Set(expandedNodes);
      if (isExpanded) {
        newExpanded.delete(node.id);
      } else {
        newExpanded.add(node.id);
      }
      setExpandedNodes(newExpanded);
    };

    return (
      <div key={node.id} style={{ marginLeft: `${level * 20}px` }} className="mb-1">
        <div
          className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 cursor-pointer"
          onClick={() => onSelectNode(node.id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand();
              }}
              className="w-4 h-4 flex items-center justify-center text-gray-500"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <div className="w-4" />}

          <div className="flex-1 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">
              {nodeData.label}
            </span>
            <span className="text-xs text-gray-500">
              ({nodeData.role})
            </span>
            {nodeData.isHierarchyRoot && (
              <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                Root
              </span>
            )}
            {nodeData.isSubTeamLeader && (
              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                Sub-Team Leader
              </span>
            )}
          </div>

          {nodeData.hierarchyChildren && nodeData.hierarchyChildren.length > 0 && (
            <span className="text-xs text-gray-400">
              {nodeData.hierarchyChildren.length} members
            </span>
          )}
        </div>

        {isExpanded && children.length > 0 && (
          <div className="ml-2">
            {children.map((child: any) => renderTreeNode(child, hierarchyId))}
          </div>
        )}
      </div>
    );
  };

  const hierarchies = Array.from(getHierarchies().values());

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Canvas Hierarchies
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                View and manage hierarchical teams on the canvas
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {hierarchies.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">No hierarchies on canvas</p>
              <p className="text-sm">
                Create a hierarchical team using the "Create Hierarchy" button
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 h-full">
              {/* Left: Hierarchy List */}
              <div className="border-r border-gray-200 p-4 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                  Hierarchies ({hierarchies.length})
                </h3>
                <div className="space-y-2">
                  {hierarchies.map(hierarchy => (
                    <div
                      key={hierarchy.hierarchyId}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        selectedHierarchy === hierarchy.hierarchyId
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedHierarchy(hierarchy.hierarchyId)}
                    >
                      <div className="font-medium text-gray-900 mb-1">
                        {hierarchy.hierarchyName}
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        {hierarchy.teamName}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>👥 {hierarchy.nodeCount} agents</span>
                        <span>📊 Level {hierarchy.depth + 1}</span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditHierarchy(hierarchy.hierarchyId);
                          }}
                          className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete hierarchy "${hierarchy.hierarchyName}"?`)) {
                              onDeleteHierarchy(hierarchy.hierarchyId);
                            }
                          }}
                          className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Tree View */}
              <div className="lg:col-span-2 p-4 overflow-y-auto">
                {selectedHierarchy ? (
                  <>
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                        Team Structure
                      </h3>
                      <p className="text-xs text-gray-500">
                        Click on nodes to select them on the canvas. Click arrows to expand/collapse.
                      </p>
                    </div>
                    {(() => {
                      const tree = buildTreeStructure(selectedHierarchy);
                      return tree ? (
                        <div className="bg-gray-50 rounded-lg p-4">
                          {renderTreeNode(tree, selectedHierarchy)}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>Could not build tree structure</p>
                          <p className="text-xs mt-1">
                            This hierarchy may have been partially deleted
                          </p>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <p className="text-lg mb-2">Select a hierarchy</p>
                      <p className="text-sm">
                        Choose a hierarchy from the left to view its structure
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
