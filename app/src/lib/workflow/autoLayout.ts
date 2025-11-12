import dagre from 'dagre';
import type { Node, Edge } from 'reactflow';
import type { WorkflowNode, WorkflowEdge } from '@/types/workflow';

/**
 * Auto-layout using Dagre
 * Arranges workflow nodes in a hierarchical layout
 * Handles hierarchies and regular workflows separately
 */

interface LayoutOptions {
  direction?: 'TB' | 'LR' | 'BT' | 'RL'; // Top-to-Bottom, Left-to-Right, etc.
  nodeWidth?: number;
  nodeHeight?: number;
  rankSep?: number; // Separation between ranks
  nodeSep?: number; // Separation between nodes in same rank
  hierarchySpacing?: number; // Space between different hierarchies
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  direction: 'TB',
  nodeWidth: 352, // Average width (min 288px, max 512px) - 20% smaller
  nodeHeight: 124, // Fixed height for all nodes - 20% smaller, then +10% higher
  rankSep: 64, // Vertical spacing between ranks - 20% smaller
  nodeSep: 64, // Horizontal spacing between nodes - 20% smaller
  hierarchySpacing: 200, // Spacing between different hierarchies - 20% smaller
};

/**
 * Group nodes by hierarchy
 */
interface HierarchyGroup {
  hierarchyId: string | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  rootNode?: WorkflowNode;
}

function groupByHierarchy(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): HierarchyGroup[] {
  const groups = new Map<string | null, HierarchyGroup>();

  // Group nodes by hierarchyId
  nodes.forEach(node => {
    const nodeData = node.data as any;
    const hierarchyId = nodeData.hierarchyId || null;

    if (!groups.has(hierarchyId)) {
      groups.set(hierarchyId, {
        hierarchyId,
        nodes: [],
        edges: [],
        rootNode: undefined,
      });
    }

    const group = groups.get(hierarchyId)!;
    group.nodes.push(node);

    // Track root node for hierarchies
    if (hierarchyId && nodeData.isHierarchyRoot) {
      group.rootNode = node;
    }
  });

  // Group edges by hierarchy
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    if (sourceNode && targetNode) {
      const sourceData = sourceNode.data as any;
      const targetData = targetNode.data as any;

      // Edge belongs to hierarchy if both nodes are in same hierarchy
      if (sourceData.hierarchyId && sourceData.hierarchyId === targetData.hierarchyId) {
        const group = groups.get(sourceData.hierarchyId);
        if (group) {
          group.edges.push(edge);
        }
      } else if (!sourceData.hierarchyId && !targetData.hierarchyId) {
        // Non-hierarchy edge
        const group = groups.get(null);
        if (group) {
          group.edges.push(edge);
        }
      }
    }
  });

  return Array.from(groups.values());
}

/**
 * Layout a hierarchy as a tree structure
 */
function layoutHierarchyAsTree(
  group: HierarchyGroup,
  options: Required<LayoutOptions>,
  offsetX: number = 0,
  offsetY: number = 0
): WorkflowNode[] {
  if (!group.rootNode) {
    // Fallback to dagre layout if no root found
    return layoutGroupWithDagre([group], options, offsetX, offsetY);
  }

  const nodeData = group.rootNode.data as any;
  const hierarchyChildren = nodeData.hierarchyChildren || [];

  // Build tree structure from hierarchyChildren metadata
  const positionedNodes: WorkflowNode[] = [];
  const processedNodes = new Set<string>();

  function layoutNode(
    nodeId: string,
    x: number,
    y: number,
    level: number
  ): { width: number; height: number } {
    if (processedNodes.has(nodeId)) {
      return { width: 0, height: 0 };
    }

    const node = group.nodes.find(n => n.id === nodeId);
    if (!node) {
      return { width: 0, height: 0 };
    }

    processedNodes.add(nodeId);

    const data = node.data as any;
    const children = data.hierarchyChildren || [];

    // Position current node
    positionedNodes.push({
      ...node,
      position: { x: x + offsetX, y: y + offsetY },
    });

    if (children.length === 0) {
      return { width: options.nodeWidth, height: options.nodeHeight };
    }

    // Layout children horizontally below this node
    let childX = x;
    let maxChildHeight = 0;
    const childWidths: number[] = [];

    children.forEach((childId: string) => {
      const childSize = layoutNode(
        childId,
        childX,
        y + options.nodeHeight + options.rankSep,
        level + 1
      );
      childWidths.push(childSize.width);
      childX += childSize.width + options.nodeSep;
      maxChildHeight = Math.max(maxChildHeight, childSize.height);
    });

    const totalWidth = childWidths.reduce((sum, w) => sum + w, 0) +
                       (children.length - 1) * options.nodeSep;

    // Center parent above children
    const parentX = x + totalWidth / 2 - options.nodeWidth / 2;
    const parentNode = positionedNodes.find(n => n.id === nodeId);
    if (parentNode) {
      parentNode.position.x = parentX + offsetX;
    }

    return {
      width: Math.max(totalWidth, options.nodeWidth),
      height: options.nodeHeight + options.rankSep + maxChildHeight,
    };
  }

  // Start layout from root
  layoutNode(group.rootNode.id, 0, 0, 0);

  // Add any nodes not in the tree (shouldn't happen, but safety)
  group.nodes.forEach(node => {
    if (!processedNodes.has(node.id)) {
      positionedNodes.push({
        ...node,
        position: {
          x: offsetX,
          y: offsetY + positionedNodes.length * (options.nodeHeight + options.rankSep),
        },
      });
    }
  });

  return positionedNodes;
}

/**
 * Layout a group of nodes using Dagre
 */
function layoutGroupWithDagre(
  groups: HierarchyGroup[],
  options: Required<LayoutOptions>,
  offsetX: number = 0,
  offsetY: number = 0
): WorkflowNode[] {
  const allNodes = groups.flatMap(g => g.nodes);
  const allEdges = groups.flatMap(g => g.edges);

  if (allNodes.length === 0) {
    return [];
  }

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure graph
  dagreGraph.setGraph({
    rankdir: options.direction,
    ranksep: options.rankSep,
    nodesep: options.nodeSep,
  });

  // Add nodes
  allNodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: options.nodeWidth,
      height: options.nodeHeight,
    });
  });

  // Add edges
  allEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply positions to nodes
  const layoutedNodes = allNodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - options.nodeWidth / 2 + offsetX,
        y: nodeWithPosition.y - options.nodeHeight / 2 + offsetY,
      },
    };
  });

  return layoutedNodes;
}

/**
 * Apply Dagre auto-layout to React Flow nodes and edges
 * (kept for backward compatibility)
 */
export function getLayoutedElements(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  options: LayoutOptions = {}
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure graph
  dagreGraph.setGraph({
    rankdir: opts.direction,
    ranksep: opts.rankSep,
    nodesep: opts.nodeSep,
  });

  // Add nodes
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: opts.nodeWidth,
      height: opts.nodeHeight,
    });
  });

  // Add edges
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply positions to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    return {
      ...node,
      position: {
        // Center the node at the Dagre position
        x: nodeWithPosition.x - opts.nodeWidth / 2,
        y: nodeWithPosition.y - opts.nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

/**
 * Get layout direction based on workflow structure
 * - Sequential workflows: Top-to-Bottom
 * - Wide workflows: Left-to-Right
 */
export function getOptimalDirection(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): 'TB' | 'LR' {
  if (nodes.length <= 3) {
    return 'TB';
  }

  // Calculate average fan-out (edges per node)
  const fanOut = edges.length / nodes.length;

  // If high fan-out, use LR to spread horizontally
  if (fanOut > 1.5) {
    return 'LR';
  }

  // Find longest path to determine if deep or wide
  const maxDepth = findMaxDepth(nodes, edges);

  // Deep workflow → TB, Wide workflow → LR
  return maxDepth > 5 ? 'TB' : 'LR';
}

/**
 * Find maximum depth of the graph
 */
function findMaxDepth(nodes: WorkflowNode[], edges: WorkflowEdge[]): number {
  // Build adjacency list
  const adj = new Map<string, string[]>();
  nodes.forEach(n => adj.set(n.id, []));
  edges.forEach(e => {
    adj.get(e.source)?.push(e.target);
  });

  // Find entry points (nodes with no incoming edges)
  const incomingCount = new Map<string, number>();
  nodes.forEach(n => incomingCount.set(n.id, 0));
  edges.forEach(e => {
    incomingCount.set(e.target, (incomingCount.get(e.target) || 0) + 1);
  });

  const entryPoints = nodes.filter(n => incomingCount.get(n.id) === 0);

  // DFS to find max depth
  const visited = new Set<string>();
  let maxDepth = 0;

  function dfs(nodeId: string, depth: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    maxDepth = Math.max(maxDepth, depth);

    const neighbors = adj.get(nodeId) || [];
    neighbors.forEach(neighbor => dfs(neighbor, depth + 1));
  }

  entryPoints.forEach(node => dfs(node.id, 1));

  return maxDepth;
}

/**
 * Auto-layout with smart direction selection and hierarchy support
 */
export function autoLayout(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  options: Omit<LayoutOptions, 'direction'> & { preservePosition?: boolean } = {}
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  if (nodes.length === 0) {
    return { nodes: [], edges };
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Group nodes by hierarchy
  const groups = groupByHierarchy(nodes, edges);

  // Separate hierarchy groups from non-hierarchy nodes
  const hierarchyGroups = groups.filter(g => g.hierarchyId !== null);
  const workflowGroup = groups.find(g => g.hierarchyId === null);

  const layoutedNodes: WorkflowNode[] = [];
  let currentX = 0;
  let currentY = 0;
  let maxHeightInRow = 0;

  // Layout each hierarchy as a tree
  hierarchyGroups.forEach((group, index) => {
    console.log(`Laying out hierarchy ${group.hierarchyId} with ${group.nodes.length} nodes`);

    const hierarchyNodes = layoutHierarchyAsTree(group, opts, currentX, currentY);
    layoutedNodes.push(...hierarchyNodes);

    // Calculate bounds of this hierarchy
    const maxX = Math.max(...hierarchyNodes.map(n => n.position.x + opts.nodeWidth));
    const maxY = Math.max(...hierarchyNodes.map(n => n.position.y + opts.nodeHeight));

    maxHeightInRow = Math.max(maxHeightInRow, maxY - currentY);

    // Move to next position (horizontally with spacing)
    currentX = maxX + opts.hierarchySpacing;

    // Wrap to next row if too wide (after 3 hierarchies)
    if ((index + 1) % 3 === 0) {
      currentX = 0;
      currentY += maxHeightInRow + opts.hierarchySpacing;
      maxHeightInRow = 0;
    }
  });

  // Layout non-hierarchy workflow nodes
  if (workflowGroup && workflowGroup.nodes.length > 0) {
    console.log(`Laying out ${workflowGroup.nodes.length} workflow nodes`);

    if (options.preservePosition) {
      // ALWAYS preserve position when flag is set
      // Strategy: Keep disconnected nodes exactly where they are
      //           Only layout connected components with position preservation

      // Identify disconnected nodes (no edges connecting to them)
      const nodeIds = new Set(workflowGroup.nodes.map(n => n.id));
      const connectedNodeIds = new Set<string>();

      workflowGroup.edges.forEach(edge => {
        if (nodeIds.has(edge.source)) connectedNodeIds.add(edge.source);
        if (nodeIds.has(edge.target)) connectedNodeIds.add(edge.target);
      });

      const disconnectedNodes = workflowGroup.nodes.filter(n => !connectedNodeIds.has(n.id));
      const connectedNodes = workflowGroup.nodes.filter(n => connectedNodeIds.has(n.id));

      console.log(`Disconnected nodes: ${disconnectedNodes.length}, Connected nodes: ${connectedNodes.length}`);

      // Keep disconnected nodes at their exact current positions
      disconnectedNodes.forEach(node => {
        layoutedNodes.push({
          ...node,
          position: { ...node.position } // Keep exact position
        });
      });

      // Layout connected nodes while preserving their general area
      if (connectedNodes.length > 0) {
        const centerX = connectedNodes.reduce((sum, n) => sum + n.position.x, 0) / connectedNodes.length;
        const centerY = connectedNodes.reduce((sum, n) => sum + n.position.y, 0) / connectedNodes.length;

        const direction = getOptimalDirection(connectedNodes, workflowGroup.edges);
        const tempLayouted = layoutGroupWithDagre(
          [{ ...workflowGroup, nodes: connectedNodes }],
          { ...opts, direction },
          0,
          0
        );

        const layoutedCenterX = tempLayouted.reduce((sum, n) => sum + n.position.x, 0) / tempLayouted.length;
        const layoutedCenterY = tempLayouted.reduce((sum, n) => sum + n.position.y, 0) / tempLayouted.length;

        const offsetX = centerX - layoutedCenterX;
        const offsetY = centerY - layoutedCenterY;

        console.log(`Preserving connected nodes position: center (${centerX}, ${centerY}), offset (${offsetX}, ${offsetY})`);

        // Apply offset to connected nodes
        tempLayouted.forEach(node => {
          layoutedNodes.push({
            ...node,
            position: {
              x: node.position.x + offsetX,
              y: node.position.y + offsetY
            }
          });
        });
      }
    } else {
      // Original behavior when NOT preserving position
      let workflowOffsetX = 0;
      let workflowOffsetY = 0;

      if (hierarchyGroups.length > 0) {
        workflowOffsetY = currentY + maxHeightInRow + opts.hierarchySpacing;
        console.log(`Positioning workflow nodes below hierarchies at Y=${workflowOffsetY}`);
      }

      const direction = getOptimalDirection(workflowGroup.nodes, workflowGroup.edges);
      const workflowNodes = layoutGroupWithDagre(
        [workflowGroup],
        { ...opts, direction },
        workflowOffsetX,
        workflowOffsetY
      );
      layoutedNodes.push(...workflowNodes);
    }
  }

  console.log(`Auto-layout complete: ${layoutedNodes.length} nodes positioned`);

  return { nodes: layoutedNodes, edges };
}
