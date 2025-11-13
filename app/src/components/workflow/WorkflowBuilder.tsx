import { useCallback, useRef, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlowProvider,
  type Node,
  type Edge,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { AgentNode } from './AgentNode';
import { AgentPalette } from './AgentPalette';
import { NodeConfigModal } from './NodeConfigModal';
import { EdgeConfigModal } from './EdgeConfigModal';
import { SimulationPanel } from './SimulationPanel';
import { SpecExportDialog } from './SpecExportDialog';
import { GroupChatPanel } from './GroupChatPanel';
import { HierarchicalTeamBuilder } from './HierarchicalTeamBuilder';
import { ScatterGatherBuilder } from './ScatterGatherBuilder';
import { A2AProtocolPanel } from './A2AProtocolPanel';
import { ConflictResolutionPanel } from './ConflictResolutionPanel';
import { ExecutionMonitoringPanel } from './ExecutionMonitoringPanel';
import { WorkflowTemplateMarketplacePanel } from './WorkflowTemplateMarketplacePanel';
import { useWorkflowStore } from '@/store/workflowStore';
import { autoLayout } from '@/lib/workflow/autoLayout';
import { getAgentTemplate } from '@/lib/workflow/agentTemplates';
import type { AgentRole, WorkflowNode, OrchestrationMode, WorkflowGraph } from '@/types/workflow';
import type { HierarchyConfig, Team, TeamMember } from '@/lib/workflow/hierarchicalTeams';
import type { ScatterGatherConfig } from '@/lib/workflow/scatterGather';

/**
 * Visual Workflow Builder
 * Features:
 * - React Flow canvas with custom agent nodes
 * - Drag-and-drop from agent palette
 * - Auto-validation on changes
 * - Mini-map and controls
 * - Validation feedback panel
 */

const nodeTypes: NodeTypes = {
  default: AgentNode,
};

function WorkflowBuilderInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<WorkflowEdge | null>(null);
  const [showEdgeConfigModal, setShowEdgeConfigModal] = useState(false);

  // Menu state
  const [showToolsMenu, setShowToolsMenu] = useState(false);

  // Phase 7 Feature Dialogs
  const [showSimulation, setShowSimulation] = useState(false);
  const [showSpecExport, setShowSpecExport] = useState(false);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [showHierarchicalTeams, setShowHierarchicalTeams] = useState(false);
  const [showScatterGather, setShowScatterGather] = useState(false);
  const [showA2AProtocol, setShowA2AProtocol] = useState(false);
  const [showConflictResolution, setShowConflictResolution] = useState(false);
  const [showExecutionMonitoring, setShowExecutionMonitoring] = useState(false);
  const [showTemplateMarketplace, setShowTemplateMarketplace] = useState(false);

  const {
    nodes,
    edges,
    validation,
    suggestions,
    currentWorkflow,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    addNodes,
    addEdges,
    deleteNode,
    clearWorkflow,
    exportAsMarkdown,
    saveCurrentWorkflow,
  } = useWorkflowStore();

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside tools menu
      if (!target.closest('.tools-menu-container')) {
        setShowToolsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // Can be either a built-in AgentRole or a custom agent ID
      const agentId = event.dataTransfer.getData('application/reactflow');
      if (!agentId || !reactFlowWrapper.current || !reactFlowInstance) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();

      // Project cursor position to canvas coordinates
      const cursorPosition = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      // Offset to center node under cursor (React Flow uses top-left corner)
      // Average node size: 352px wide x 124px tall (from autoLayout defaults)
      const NODE_WIDTH = 352;
      const NODE_HEIGHT = 124;

      const dropPosition = {
        x: cursorPosition.x - NODE_WIDTH / 2,
        y: cursorPosition.y - NODE_HEIGHT / 2,
      };

      // Smart alignment: align with nearby nodes while staying in the drop area
      const alignedPosition = alignWithNearbyNodes(dropPosition, nodes);

      // Add node at aligned position (supports both built-in roles and custom agent IDs)
      addNode(agentId, alignedPosition);
    },
    [reactFlowInstance, addNode, nodes]
  );

  /**
   * Align dropped node with nearby nodes
   * - Snap to grid (50px increments)
   * - Align horizontally or vertically with nearby nodes
   * - Stay within reasonable distance from drop position
   */
  const alignWithNearbyNodes = (
    dropPos: { x: number; y: number },
    existingNodes: WorkflowNode[]
  ): { x: number; y: number } => {
    const GRID_SIZE = 50;
    const ALIGNMENT_THRESHOLD = 100; // Max distance to consider for alignment
    const SNAP_DISTANCE = 25; // How close to snap to aligned position

    // Start with grid-snapped position
    let alignedX = Math.round(dropPos.x / GRID_SIZE) * GRID_SIZE;
    let alignedY = Math.round(dropPos.y / GRID_SIZE) * GRID_SIZE;

    if (existingNodes.length === 0) {
      return { x: alignedX, y: alignedY };
    }

    // Find nearby nodes within alignment threshold
    const nearbyNodes = existingNodes.filter(node => {
      const dx = Math.abs(node.position.x - dropPos.x);
      const dy = Math.abs(node.position.y - dropPos.y);
      return dx < ALIGNMENT_THRESHOLD || dy < ALIGNMENT_THRESHOLD;
    });

    if (nearbyNodes.length === 0) {
      return { x: alignedX, y: alignedY };
    }

    // Try to align horizontally (same Y) with nearest node
    const horizontalCandidates = nearbyNodes
      .filter(node => Math.abs(node.position.y - dropPos.y) < SNAP_DISTANCE * 2)
      .sort((a, b) => Math.abs(a.position.y - dropPos.y) - Math.abs(b.position.y - dropPos.y));

    if (horizontalCandidates.length > 0) {
      const targetY = horizontalCandidates[0].position.y;
      if (Math.abs(targetY - alignedY) < SNAP_DISTANCE) {
        alignedY = targetY;
      }
    }

    // Try to align vertically (same X) with nearest node
    const verticalCandidates = nearbyNodes
      .filter(node => Math.abs(node.position.x - dropPos.x) < SNAP_DISTANCE * 2)
      .sort((a, b) => Math.abs(a.position.x - dropPos.x) - Math.abs(b.position.x - dropPos.x));

    if (verticalCandidates.length > 0) {
      const targetX = verticalCandidates[0].position.x;
      if (Math.abs(targetX - alignedX) < SNAP_DISTANCE) {
        alignedX = targetX;
      }
    }

    return { x: alignedX, y: alignedY };
  };

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node as WorkflowNode);
      setShowConfigModal(true);
    },
    []
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      setSelectedEdge(edge as WorkflowEdge);
      setShowEdgeConfigModal(true);
    },
    []
  );

  const handleAutoLayout = useCallback(() => {
    if (!reactFlowInstance) return;

    console.log('=== AUTO-LAYOUT START ===');
    console.log('Total nodes:', nodes.length);
    console.log('Total edges:', edges.length);

    // Use preservePosition to keep nodes in their general area
    const layouted = autoLayout(nodes, edges, { preservePosition: true });

    console.log('Layouted nodes:', layouted.nodes.length);

    // Update all node positions at once (more efficient)
    const nodePositionMap = new Map(
      layouted.nodes.map(n => [n.id, n.position])
    );

    reactFlowInstance.setNodes((nds: Node[]) =>
      nds.map(n => {
        const newPosition = nodePositionMap.get(n.id);
        return newPosition ? { ...n, position: newPosition } : n;
      })
    );

    // Fit view after layout with more padding to avoid cropping
    window.requestAnimationFrame(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
    });

    console.log('=== AUTO-LAYOUT COMPLETE ===');
  }, [reactFlowInstance, nodes, edges]);

  const handleClear = useCallback(() => {
    if (confirm('Clear entire workflow? This cannot be undone.')) {
      clearWorkflow();
    }
  }, [clearWorkflow]);

  // Helper function to convert hierarchical team to canvas nodes
  const convertHierarchyToNodes = useCallback((hierarchy: HierarchyConfig) => {
    const newNodes: WorkflowNode[] = [];
    const newEdges: typeof edges = [];
    let yOffset = 100;

    // Generate unique hierarchy ID and metadata
    // If editing an existing hierarchy, use its ID and createdAt
    const hierarchyId = hierarchy.editingHierarchyId || `hierarchy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const hierarchyCreatedAt = hierarchy.editingHierarchyCreatedAt || Date.now();
    const hierarchyName = hierarchy.name;
    const teamName = hierarchy.rootTeam.name;

    console.log('convertHierarchyToNodes:', {
      isEditing: !!hierarchy.editingHierarchyId,
      hierarchyId,
      hierarchyCreatedAt,
      hierarchyName,
    });

    // Track parent-child relationships for metadata
    const nodeChildrenMap = new Map<string, string[]>();

    // Helper to find existing node by ID
    const findExistingNode = (agentId: string): WorkflowNode | undefined => {
      return nodes.find(n => n.id === agentId);
    };

    // Helper to get node data from agentId (template, clone, link, or null for generic)
    const getNodeSourceData = (agentId: string): Partial<WorkflowNode> | null | 'link' => {
      // Check if it's a template reference
      if (agentId.startsWith('template:')) {
        const role = agentId.replace('template:', '') as AgentRole;
        const template = getAgentTemplate(role);
        return {
          data: {
            label: template.name,
            role: role,
            promptTemplate: template.promptTemplate,
            description: template.description,
            config: {
              thinkingMode: template.defaultConfig.thinkingMode || 'balanced',
              parallel: template.defaultConfig.parallel || false,
            },
            inputs: [],
            outputs: [],
          },
        };
      }

      // Check if it's a clone reference
      if (agentId.startsWith('clone:')) {
        const realId = agentId.replace('clone:', '');
        const existingNode = findExistingNode(realId);
        if (existingNode) {
          return existingNode;
        }
      }

      // Check if it's a link reference (use existing node directly)
      if (agentId.startsWith('link:')) {
        return 'link';
      }

      // Check if it's a direct existing canvas node reference (legacy format)
      const existingNode = findExistingNode(agentId);
      if (existingNode) {
        return existingNode;
      }

      // Neither template nor existing - caller will create generic
      return null;
    };

    // Helper to build domain string from specialization and capabilities
    const buildDomain = (specialization?: string, capabilities?: string[]) => {
      if (!specialization && (!capabilities || capabilities.length === 0)) {
        return '';
      }
      if (specialization && capabilities && capabilities.length > 0) {
        return `${specialization} with concentration on ${capabilities.join(', ')}`;
      }
      if (specialization) {
        return specialization;
      }
      return capabilities?.join(', ') || '';
    };

    // Helper function to generate sub-team orchestration instructions
    const generateSubTeamOrchestrationPrompt = (basePrompt: string, subTeamName: string, subTeamMemberCount: number) => {
      const orchestrationInstructions = `

---

## SUB-TEAM LEADERSHIP RESPONSIBILITIES

As the leader of the ${subTeamName} team (${subTeamMemberCount} member${subTeamMemberCount > 1 ? 's' : ''}), you are responsible for:

### 1. ORCHESTRATION
- Break down your assigned objectives into sub-tasks for your team members
- Coordinate work distribution based on team member capabilities
- Maintain overall timeline and workflow coherence

### 2. DELEGATION
- Assign specific tasks to appropriate team members
- Provide clear context and success criteria for each delegation
- Invoke team members via Task tool when delegating work
- Track which team members are working on which tasks

### 3. MONITORING & VALIDATION
- Track artifact creation by team members
- Validate each team member's output against quality standards
- Request revisions if outputs don't meet requirements
- Ensure all sub-tasks are completed before aggregating results

### 4. RESULT AGGREGATION
- Collect all outputs from your team members
- Synthesize individual contributions into cohesive deliverables
- Resolve any conflicts or inconsistencies between outputs
- Produce unified results that fulfill your responsibilities to the parent team

### Delegation Protocol
For each sub-task:
1. Identify the appropriate team member based on their capabilities
2. Invoke via Task tool with clear instructions and context
3. Wait for artifact/output creation
4. Validate output quality
5. Iterate if needed (request revisions)
6. Integrate validated output into final deliverable

### Parallel Execution
When possible, delegate independent tasks to multiple team members in parallel:
- Identify sub-tasks with no interdependencies
- Invoke multiple team members in a single message
- Wait for all to complete, then aggregate results

### Coordination Pattern
<thinking>
After each team member completes their task:
- Assess output quality and completeness
- Determine if iteration is needed
- Update coordination state (what's done, what's pending)
- Decide next steps (delegate more work, aggregate results, or escalate to parent team)
</thinking>
`;

      return basePrompt + orchestrationInstructions;
    };

    // Constants for improved layout
    const NODE_WIDTH = 300; // Approximate node width
    const NODE_HEIGHT = 200; // Vertical spacing between levels
    const HORIZONTAL_SPACING = 50; // Minimum horizontal gap between nodes

    // Recursive function to process team and create nodes with improved positioning
    const processTeam = (team: Team, xOffset: number, depth: number, existingLeaderNodeId?: string) => {
      const teamMembers = team.members;
      const leaderMember = teamMembers.find(m => m.id === team.leaderId);

      // If no leader member found in this team's members, it might be a sub-team
      // where the leader is from the parent team (passed as existingLeaderNodeId)
      if (!leaderMember && !existingLeaderNodeId) {
        return { width: 0, leaderNodeId: null };
      }

      let leaderNodeId: string;

      // If existingLeaderNodeId is provided, use it (sub-team case)
      if (existingLeaderNodeId) {
        leaderNodeId = existingLeaderNodeId;
      } else if (leaderMember) {
        // Get source data (template, clone, link, or null for generic)
        const leaderSourceData = getNodeSourceData(leaderMember.agentId);

        // Handle link case - use existing node directly
        if (leaderSourceData === 'link') {
          const realId = leaderMember.agentId.replace('link:', '');
          const existingNode = findExistingNode(realId);
          if (existingNode) {
            // Use existing node ID, update its metadata with hierarchy info
            leaderNodeId = existingNode.id;
            existingNode.data = {
              ...existingNode.data,
              hierarchyId,
              hierarchyName,
              teamName: team.name,
              isHierarchyRoot: depth === 0,
              hierarchyDepth: depth,
              hierarchyCreatedAt,
              hierarchyChildren: [],
              specialization: leaderMember.specialization,
              capabilities: leaderMember.capabilities,
            } as any;
            nodeChildrenMap.set(leaderNodeId, []);
          } else {
            // Fallback if node not found
            return { width: 0, leaderNodeId: null };
          }
        } else {
          // Build domain string for leader
          const leaderDomain = buildDomain(leaderMember.specialization, leaderMember.capabilities);

          // Count team members (excluding leader) for orchestration
          const teamMemberCount = teamMembers.filter(m => m.id !== team.leaderId).length;

          // Build base prompt template
          let leaderBasePrompt = leaderSourceData
            ? (leaderDomain
                ? leaderSourceData.data!.promptTemplate.replace(/{{domain}}/g, leaderDomain)
                : leaderSourceData.data!.promptTemplate)
            : (leaderDomain
                ? `Team leader for ${team.name}. Domain: ${leaderDomain}. ${team.description || ''}`
                : `Team leader for ${team.name}. ${team.description || ''}`);

          // If leader has team members, enhance prompt with orchestration instructions
          if (teamMemberCount > 0) {
            leaderBasePrompt = generateSubTeamOrchestrationPrompt(leaderBasePrompt, team.name, teamMemberCount);
          }

          // Create new node (clone, template, or generic)
          const leaderNode: WorkflowNode = leaderSourceData
            ? {
                ...leaderSourceData,
                id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'agent',
                position: { x: xOffset, y: yOffset + (depth * NODE_HEIGHT) },
                data: {
                  ...leaderSourceData.data!,
                  label: leaderSourceData.data!.label || `${team.name} Leader`,
                  domain: leaderDomain || undefined,
                  promptTemplate: leaderBasePrompt,
                  // Hierarchy metadata
                  hierarchyId,
                  hierarchyName,
                  teamName: team.name,
                  isHierarchyRoot: depth === 0,
                  hierarchyDepth: depth,
                  hierarchyCreatedAt,
                  hierarchyChildren: [],
                  specialization: leaderMember.specialization,
                  capabilities: leaderMember.capabilities,
                } as any,
              }
            : {
                id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'agent',
                position: { x: xOffset, y: yOffset + (depth * NODE_HEIGHT) },
                data: {
                  label: `${team.name} Leader`,
                  role: 'orchestrator' as AgentRole,
                  promptTemplate: leaderBasePrompt,
                  description: `Leader of ${team.name}`,
                  domain: leaderDomain || undefined,
                  config: {
                    thinkingMode: 'balanced' as const,
                    parallel: false,
                  },
                  inputs: [],
                  outputs: [],
                  // Hierarchy metadata
                  hierarchyId,
                  hierarchyName,
                  teamName: team.name,
                  isHierarchyRoot: depth === 0,
                  hierarchyDepth: depth,
                  hierarchyCreatedAt,
                  hierarchyChildren: [],
                  specialization: leaderMember?.specialization,
                  capabilities: leaderMember?.capabilities || ['leadership', 'delegation'],
                } as any,
              };
          newNodes.push(leaderNode);
          leaderNodeId = leaderNode.id;
          nodeChildrenMap.set(leaderNodeId, []);
        }
      } else {
        return { width: 0, leaderNodeId: null };
      }

      // Calculate member positions and subtree widths
      const memberNodes: string[] = [];
      const memberSubtreeWidths: number[] = [];
      let totalWidth = 0;

      // First pass: calculate subtree widths for members with sub-teams
      teamMembers.forEach((member) => {
        if (member.id === team.leaderId) return;

        if (member.subTeam) {
          // Calculate subtree width recursively (we'll do a dry run)
          const subTeamMemberCount = member.subTeam.members.length;
          const estimatedWidth = Math.max(NODE_WIDTH, subTeamMemberCount * (NODE_WIDTH + HORIZONTAL_SPACING));
          memberSubtreeWidths.push(estimatedWidth);
          totalWidth += estimatedWidth + HORIZONTAL_SPACING;
        } else {
          memberSubtreeWidths.push(NODE_WIDTH);
          totalWidth += NODE_WIDTH + HORIZONTAL_SPACING;
        }
      });

      // Calculate starting X position to center members under leader
      let currentX = xOffset - (totalWidth / 2);

      // Create nodes for team members
      let memberIndex = 0;
      teamMembers.forEach((member, index) => {
        if (member.id === team.leaderId) return; // Skip leader, already handled

        // Get source data (template, clone, link, or null for generic)
        const memberSourceData = getNodeSourceData(member.agentId);

        // Calculate member X position (center of its subtree) - needed for both link and new nodes
        const memberSubtreeWidth = memberSubtreeWidths[memberIndex];
        const memberX = currentX + (memberSubtreeWidth / 2);

        let memberNodeId: string;

        // Handle link case - use existing node directly
        if (memberSourceData === 'link') {
          const realId = member.agentId.replace('link:', '');
          const existingNode = findExistingNode(realId);
          if (existingNode) {
            memberNodeId = existingNode.id;
            // Update existing node with hierarchy metadata
            const isSubTeamLeader = !!member.subTeam;
            existingNode.data = {
              ...existingNode.data,
              hierarchyId,
              hierarchyName,
              teamName: team.name,
              hierarchyDepth: depth + 1,
              hierarchyCreatedAt,
              hierarchyChildren: [],
              isSubTeamLeader,
              specialization: member.specialization || existingNode.data.label,
              capabilities: member.capabilities,
            } as any;
            nodeChildrenMap.set(memberNodeId, []);
          } else {
            // Skip if node not found
            return;
          }
        } else {
          // Build domain string for this member
          const memberDomain = buildDomain(member.specialization, member.capabilities);

          // Determine if this member is a sub-team leader
          const isSubTeamLeader = !!member.subTeam;
          const subTeamName = member.subTeam?.name || `${member.specialization || 'Sub-team'} Team`;
          const subTeamMemberCount = member.subTeam?.members.length || 0;

          // Build base prompt template
          let basePromptTemplate = memberSourceData
            ? (memberDomain
                ? memberSourceData.data!.promptTemplate.replace(/{{domain}}/g, memberDomain)
                : memberSourceData.data!.promptTemplate)
            : (memberDomain
                ? `${member.role === 'specialist' ? 'Specialist' : 'Team member'}. Domain: ${memberDomain}.`
                : `${member.role === 'specialist' ? 'Specialist' : 'Team member'} with capabilities: ${member.capabilities.join(', ')}`);

          // If this is a sub-team leader, enhance prompt with orchestration instructions
          if (isSubTeamLeader) {
            basePromptTemplate = generateSubTeamOrchestrationPrompt(basePromptTemplate, subTeamName, subTeamMemberCount);
          }

          // Create new node (clone, template, or generic)
          const memberNode: WorkflowNode = memberSourceData
            ? {
                ...memberSourceData,
                id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`,
                type: 'agent',
                position: { x: memberX, y: yOffset + (depth * NODE_HEIGHT) + NODE_HEIGHT },
                data: {
                  ...memberSourceData.data!,
                  label: memberSourceData.data!.label || member.specialization || `Member ${index + 1}`,
                  domain: memberDomain || undefined,
                  promptTemplate: basePromptTemplate,
                  // Hierarchy metadata
                  hierarchyId,
                  hierarchyName,
                  teamName: team.name,
                  hierarchyDepth: depth + 1,
                  hierarchyCreatedAt,
                  hierarchyChildren: [],
                  isSubTeamLeader,
                  specialization: member.specialization,
                  capabilities: member.capabilities,
                } as any,
              }
            : {
                id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`,
                type: 'agent',
                position: { x: memberX, y: yOffset + (depth * NODE_HEIGHT) + NODE_HEIGHT },
                data: {
                  label: member.specialization || `Member ${index + 1}`,
                  role: (member.role === 'specialist' ? 'researcher' : 'worker') as AgentRole,
                  promptTemplate: basePromptTemplate,
                  description: member.role === 'specialist' ? 'Specialist' : 'Team member',
                  domain: memberDomain || undefined,
                  config: {
                    thinkingMode: 'balanced' as const,
                    parallel: false,
                  },
                  inputs: [],
                  outputs: [],
                  // Hierarchy metadata
                  hierarchyId,
                  hierarchyName,
                  teamName: team.name,
                  hierarchyDepth: depth + 1,
                  hierarchyCreatedAt,
                  hierarchyChildren: [],
                  isSubTeamLeader,
                  specialization: member.specialization,
                  capabilities: member.capabilities,
                } as any,
              };
          newNodes.push(memberNode);
          memberNodeId = memberNode.id;
          nodeChildrenMap.set(memberNodeId, []);
        }

        memberNodes.push(memberNodeId);

        // Track this child for metadata update
        const leaderChildren = nodeChildrenMap.get(leaderNodeId) || [];
        leaderChildren.push(memberNodeId);
        nodeChildrenMap.set(leaderNodeId, leaderChildren);

        // Connect leader to member
        newEdges.push({
          id: `edge-${leaderNodeId}-${memberNodeId}`,
          source: leaderNodeId,
          target: memberNodeId,
          type: 'smoothstep',
        });

        // If member has sub-team, process it recursively
        // Pass memberNodeId as the leader since this member IS the sub-team leader
        // Use currentX as the center of the subtree
        if (member.subTeam) {
          const subResult = processTeam(member.subTeam, memberX, depth + 1, memberNodeId);
          // No need to create an edge from member to leader since they're the same node
          // Just connect the leader to sub-team members (handled in processTeam)
        }

        // Move to next member position
        currentX += memberSubtreeWidths[memberIndex] + HORIZONTAL_SPACING;
        memberIndex++;
      });

      return { width: Math.max(totalWidth, NODE_WIDTH), leaderNodeId };
    };

    // Process root team
    processTeam(hierarchy.rootTeam, 400, 0);

    // Update all nodes with their hierarchyChildren metadata
    newNodes.forEach(node => {
      const children = nodeChildrenMap.get(node.id) || [];
      if (children.length > 0) {
        (node.data as any).hierarchyChildren = children;
        // Mark as sub-team leader if it has children and isn't root
        if (!(node.data as any).isHierarchyRoot) {
          (node.data as any).isSubTeamLeader = true;
        }
      }
    });

    return { nodes: newNodes, edges: newEdges };
  }, [nodes]);

  // Helper function to convert scatter-gather to canvas nodes
  const convertScatterGatherToNodes = useCallback((config: ScatterGatherConfig) => {
    const newNodes: WorkflowNode[] = [];
    const newEdges: typeof edges = [];

    // Create scatter node (coordinator)
    const scatterNode: WorkflowNode = {
      id: `node-scatter-${Date.now()}`,
      type: 'agent',
      position: { x: 400, y: 100 },
      data: {
        label: `${config.name} (Scatter)`,
        role: 'orchestrator' as AgentRole,
        promptTemplate: `Scatter coordinator: ${config.description || 'Distribute tasks to target agents'}`,
        description: `Distributes tasks to ${config.targetAgents.length} agents`,
        config: {
          thinkingMode: 'balanced' as const,
          parallel: true,
        },
        inputs: [],
        outputs: [],
      },
    };
    newNodes.push(scatterNode);

    // Create nodes for target agents (spread horizontally)
    const agentSpacing = 200;
    const startX = 400 - ((config.targetAgents.length - 1) * agentSpacing) / 2;

    config.targetAgents.forEach((agentId, index) => {
      const agentNode: WorkflowNode = {
        id: `node-target-${Date.now()}-${index}`,
        type: 'agent',
        position: { x: startX + (index * agentSpacing), y: 300 },
        data: {
          label: `Target ${index + 1}`,
          role: 'worker' as AgentRole,
          promptTemplate: `Process distributed task from scatter coordinator`,
          description: `Parallel task executor ${index + 1}`,
          config: {
            thinkingMode: 'balanced' as const,
            parallel: true,
          },
          inputs: [],
          outputs: [],
        },
      };
      newNodes.push(agentNode);

      // Connect scatter to target
      newEdges.push({
        id: `edge-scatter-${agentNode.id}`,
        source: scatterNode.id,
        target: agentNode.id,
        type: 'smoothstep',
      });
    });

    // Create gather node (aggregator)
    const gatherNode: WorkflowNode = {
      id: `node-gather-${Date.now()}`,
      type: 'agent',
      position: { x: 400, y: 500 },
      data: {
        label: `${config.name} (Gather)`,
        role: 'finalizer' as AgentRole,
        promptTemplate: `Gather and aggregate results from all target agents`,
        description: `Aggregates results from ${config.targetAgents.length} agents`,
        config: {
          thinkingMode: 'balanced' as const,
          parallel: false,
        },
        inputs: [],
        outputs: [],
      },
    };
    newNodes.push(gatherNode);

    // Connect all targets to gather
    config.targetAgents.forEach((_, index) => {
      const targetNodeId = `node-target-${Date.now()}-${index}`;
      newEdges.push({
        id: `edge-gather-${targetNodeId}`,
        source: targetNodeId,
        target: gatherNode.id,
        type: 'smoothstep',
      });
    });

    return { nodes: newNodes, edges: newEdges };
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-900">
            {currentWorkflow?.name || 'Untitled Workflow'}
          </h2>
          <span className="text-sm text-gray-500">
            ({nodes.length} agents, {edges.length} connections)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoLayout}
            disabled={nodes.length === 0}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Auto-arrange nodes"
          >
            🎯 Auto-Layout
          </button>

          {/* Tools Menu - Phase 7 Features */}
          <div className="relative tools-menu-container">
            <button
              onClick={() => setShowToolsMenu(!showToolsMenu)}
              className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
            >
              🛠️ Tools
            </button>
            {showToolsMenu && (
              <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded shadow-lg z-10">
                <button
                  onClick={() => {
                    setShowSimulation(true);
                    setShowToolsMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <span>🎬</span>
                  <span>Simulate Workflow</span>
                </button>
                <button
                  onClick={() => {
                    setShowSpecExport(true);
                    setShowToolsMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <span>📤</span>
                  <span>Export Workflow</span>
                </button>
                <hr className="my-1" />
                <button
                  onClick={() => {
                    setShowGroupChat(true);
                    setShowToolsMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <span>💬</span>
                  <span>Group Chat</span>
                </button>
                <button
                  onClick={() => {
                    setShowHierarchicalTeams(true);
                    setShowToolsMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <span>🏢</span>
                  <span>Hierarchical Teams</span>
                </button>
                <button
                  onClick={() => {
                    setShowScatterGather(true);
                    setShowToolsMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <span>⚡</span>
                  <span>Scatter-Gather</span>
                </button>
                <button
                  onClick={() => {
                    setShowA2AProtocol(true);
                    setShowToolsMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <span>🔗</span>
                  <span>A2A Protocol</span>
                </button>
                <button
                  onClick={() => {
                    setShowConflictResolution(true);
                    setShowToolsMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <span>⚠️</span>
                  <span>Conflict Resolution</span>
                </button>
                <button
                  onClick={() => {
                    setShowExecutionMonitoring(true);
                    setShowToolsMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <span>⚡</span>
                  <span>Execution Monitor</span>
                </button>
                <button
                  onClick={() => {
                    setShowTemplateMarketplace(true);
                    setShowToolsMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <span>📦</span>
                  <span>Template Marketplace</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleClear}
            disabled={nodes.length === 0}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Agent Palette */}
        <AgentPalette />

        {/* Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange as OnNodesChange}
            onEdgesChange={onEdgesChange as OnEdgesChange}
            onConnect={onConnect as OnConnect}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            onInit={setReactFlowInstance}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: false,
              style: { stroke: '#94a3b8', strokeWidth: 2 },
              labelStyle: { fill: '#1e293b', fontWeight: 600, fontSize: 12 },
              labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
              labelBgPadding: [8, 4] as [number, number],
              labelBgBorderRadius: 4,
            }}
            fitView
            className="bg-gray-50"
            minZoom={0.1}
            maxZoom={2}
          >
          <Background color="#94a3b8" gap={16} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              // Color minimap nodes by role
              const role = (node.data as any).role;
              const colors: Record<string, string> = {
                orchestrator: '#c084fc',
                architect: '#60a5fa',
                critic: '#f87171',
                'red-team': '#fb923c',
                researcher: '#4ade80',
                coder: '#2dd4bf',
                tester: '#818cf8',
                writer: '#f472b6',
                worker: '#94a3b8',
                finalizer: '#34d399',
              };
              return colors[role] || '#94a3b8';
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />

          {/* Validation Panel */}
          {validation && !validation.valid && (
            <Panel position="top-right" className="bg-white rounded-lg shadow-lg p-4 max-w-md">
              <h3 className="font-semibold text-red-600 mb-2">⚠️ Validation Issues</h3>

              {validation.errors.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Errors:</p>
                  <ul className="text-xs text-red-600 space-y-1">
                    {validation.errors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validation.warnings.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Warnings:</p>
                  <ul className="text-xs text-orange-600 space-y-1">
                    {validation.warnings.map((warning, i) => (
                      <li key={i}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {suggestions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">Suggestions:</p>
                  <ul className="text-xs text-blue-600 space-y-1">
                    {suggestions.slice(0, 3).map((suggestion, i) => (
                      <li key={i}>💡 {suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Panel>
          )}

          {/* Success Panel */}
          {validation && validation.valid && nodes.length > 0 && (
            <Panel position="top-right" className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex items-center gap-2 text-green-600">
                <span className="text-lg">✅</span>
                <span className="text-sm font-semibold">Workflow Valid</span>
              </div>
              {suggestions.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-600">
                    💡 {suggestions[0]}
                  </p>
                </div>
              )}
            </Panel>
          )}

          {/* Empty State */}
          {nodes.length === 0 && (
            <Panel position="top-center" className="bg-white rounded-lg shadow-lg p-6 max-w-md">
              <div className="text-center">
                <div className="text-4xl mb-2">🎭</div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Start Building Your Workflow
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Drag agents from the palette or click them to add to the canvas.
                  Connect agents to define your multi-agent workflow.
                </p>
                <div className="text-xs text-gray-500">
                  <p>💡 <strong>Tip:</strong> Use an <strong>Orchestrator</strong> to coordinate multiple agents</p>
                </div>
              </div>
            </Panel>
          )}
        </ReactFlow>
        </div>
      </div>

      {/* Node Configuration Modal */}
      {showConfigModal && (
        <NodeConfigModal
          node={selectedNode}
          onClose={() => {
            setShowConfigModal(false);
            setSelectedNode(null);
          }}
        />
      )}

      {/* Edge Configuration Modal */}
      {showEdgeConfigModal && selectedEdge && (
        <EdgeConfigModal
          edge={selectedEdge}
          onClose={() => {
            setShowEdgeConfigModal(false);
            setSelectedEdge(null);
          }}
        />
      )}

      {/* Phase 7 Feature Dialogs */}
      {showSimulation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl">
            <SimulationPanel
              workflow={{
                id: currentWorkflow?.id || crypto.randomUUID(),
                name: currentWorkflow?.name || 'Untitled Workflow',
                description: currentWorkflow?.description || '',
                mode: currentWorkflow?.mode || 'orchestrator',
                nodes,
                edges,
                createdAt: currentWorkflow?.createdAt || Date.now(),
                updatedAt: Date.now(),
              }}
              onClose={() => setShowSimulation(false)}
            />
          </div>
        </div>
      )}

      {showSpecExport && (
        <SpecExportDialog
          workflow={{
            id: currentWorkflow?.id || crypto.randomUUID(),
            name: currentWorkflow?.name || 'Untitled Workflow',
            description: currentWorkflow?.description || '',
            mode: currentWorkflow?.mode || 'orchestrator',
            nodes,
            edges,
            createdAt: currentWorkflow?.createdAt || Date.now(),
            updatedAt: Date.now(),
          }}
          onClose={() => setShowSpecExport(false)}
        />
      )}

      {showGroupChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-3xl">
            <GroupChatPanel
              availableAgents={nodes.map(n => ({
                id: n.id,
                label: n.data.label,
                role: n.data.role,
              }))}
              onClose={() => setShowGroupChat(false)}
            />
          </div>
        </div>
      )}

      {showHierarchicalTeams && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-3xl">
            <HierarchicalTeamBuilder
              availableAgents={nodes.map(n => ({
                id: n.id,
                label: n.data.label,
                role: n.data.role,
                ...n.data, // Include all node data for hierarchy metadata
              }))}
              onComplete={(hierarchy) => {
                console.log('WorkflowBuilder onComplete called with hierarchy:', hierarchy);
                try {
                  // If we're editing an existing hierarchy, delete the old nodes first
                  if (hierarchy.editingHierarchyId) {
                    console.log('Editing existing hierarchy, removing old nodes with ID:', hierarchy.editingHierarchyId);
                    const oldNodes = nodes.filter(n => (n.data as any).hierarchyId === hierarchy.editingHierarchyId);
                    const oldNodeIds = oldNodes.map(n => n.id);
                    console.log('Found', oldNodes.length, 'old nodes to remove:', oldNodeIds);

                    // Remove old nodes (edges will be removed automatically by React Flow)
                    oldNodeIds.forEach(nodeId => deleteNode(nodeId));
                  }

                  const { nodes: newNodes, edges: newEdges } = convertHierarchyToNodes(hierarchy);
                  console.log('Converted to nodes:', newNodes.length, 'edges:', newEdges.length);
                  console.log('Nodes:', newNodes);
                  console.log('Edges:', newEdges);

                  addNodes(newNodes);
                  addEdges(newEdges);
                  setShowHierarchicalTeams(false);

                  const action = hierarchy.editingHierarchyId ? 'updated' : 'created';
                  alert(`Hierarchy "${hierarchy.name}" ${action} with ${newNodes.length} agents on canvas!`);

                  // Auto-layout the canvas after hierarchy is created
                  window.requestAnimationFrame(() => {
                    if (reactFlowInstance) {
                      handleAutoLayout();
                    }
                  });
                } catch (error) {
                  console.error('Error in onComplete:', error);
                  alert(`Error creating hierarchy: ${error}`);
                }
              }}
              onCancel={() => setShowHierarchicalTeams(false)}
            />
          </div>
        </div>
      )}

      {showScatterGather && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-3xl">
            <ScatterGatherBuilder
              availableAgents={nodes.map(n => ({
                id: n.id,
                label: n.data.label,
                role: n.data.role,
              }))}
              onComplete={(config) => {
                console.log('Scatter-Gather config created:', config);
                const { nodes: newNodes, edges: newEdges } = convertScatterGatherToNodes(config);
                addNodes(newNodes);
                addEdges(newEdges);
                setShowScatterGather(false);
                alert(`Scatter-Gather pattern "${config.name}" created with ${newNodes.length} agents on canvas!`);
              }}
              onCancel={() => setShowScatterGather(false)}
            />
          </div>
        </div>
      )}

      {showA2AProtocol && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <A2AProtocolPanel
            availableAgents={nodes.map(n => ({
              id: n.id,
              label: n.data.label,
              role: n.data.role,
            }))}
            onClose={() => setShowA2AProtocol(false)}
          />
        </div>
      )}

      {showConflictResolution && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <ConflictResolutionPanel onClose={() => setShowConflictResolution(false)} />
        </div>
      )}

      {showExecutionMonitoring && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <ExecutionMonitoringPanel onClose={() => setShowExecutionMonitoring(false)} />
        </div>
      )}

      {showTemplateMarketplace && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <WorkflowTemplateMarketplacePanel onClose={() => setShowTemplateMarketplace(false)} />
        </div>
      )}
    </div>
  );
}

export function WorkflowBuilder() {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner />
    </ReactFlowProvider>
  );
}
