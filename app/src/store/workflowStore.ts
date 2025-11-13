import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from 'reactflow';
import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowGraph,
  AgentRole,
  OrchestrationMode,
  WorkflowValidationResult,
  WorkflowState,
} from '@/types/workflow';
import { getAgentTemplate } from '@/lib/workflow/agentTemplates';
import { agentRegistry } from '@/lib/workflow/agentRegistry';
import { validateWorkflowGraph, getValidationSuggestions } from '@/lib/workflow/graphValidator';
import { serializeWorkflowGraph, type SerializationOptions } from '@/lib/workflow/graphSerializer';
import { generateMultiAgentPackage, type OrchestratorConfig } from '@/lib/workflow/orchestratorGenerator';
import { mergeWithDefaults } from '@/lib/workflow/edgeDefaults';
import { validateEdgeData } from '@/lib/workflow/edgeValidator';
import {
  checkpointManager,
  resumeFromCheckpoint,
  saveCheckpoint,
  type Checkpoint,
  type ExecutionRecord,
  type ArtifactRegistry,
} from '@/lib/workflow/checkpointing';
import {
  artifactVersionManager,
  type VersionedArtifact,
  type ArtifactSchema,
  type VersionHistory,
  type LineageNode,
} from '@/lib/workflow/artifactVersioning';
import {
  evaluationFramework,
  type TestSuite,
  type TestSuiteResult,
  type ABTestConfig,
  type ABTestResult,
} from '@/lib/workflow/evaluationFramework';
import {
  groupChatManager,
  type GroupChatConfig,
  type GroupChatParticipant,
  type SpeakerSelectionStrategy,
  type TerminationCondition,
  type GroupChatMessage,
  type SpeakerSelectionResult,
} from '@/lib/workflow/groupChat';
import {
  workflowSimulator,
  type SimulationResult,
  type SimulationConfig,
} from '@/lib/workflow/workflowSimulation';
import {
  promptABTestingManager,
  type ABTestConfig,
  type ABTestResult,
  type PromptVariant,
} from '@/lib/workflow/promptABTesting';
import {
  a2aProtocolManager,
  type ProtocolConfig,
  type CommunicationChannel,
  type A2AMessage,
  type MessagePriority,
  type ProtocolType,
} from '@/lib/workflow/a2aProtocol';
import {
  conflictResolutionManager,
  type ArtifactConflict,
  type ConflictResolution,
  type ResolutionStrategy,
  type ArtifactDiff,
  type ConflictSeverity,
} from '@/lib/workflow/artifactConflictResolution';
import {
  executionMonitor,
  type ExecutionSession,
  type ExecutionLog,
  type LogLevel,
} from '@/lib/workflow/executionMonitoring';
import {
  workflowTemplateMarketplace,
  type WorkflowTemplate,
  type TemplateCategory,
  type TemplateFilter,
  type TemplateExportOptions,
} from '@/lib/workflow/workflowTemplateMarketplace';

interface WorkflowStore {
  // Current workflow
  currentWorkflow: WorkflowGraph | null;

  // React Flow state
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];

  // Validation
  validation: WorkflowValidationResult | null;
  suggestions: string[];

  // Checkpointing & State
  workflowState: WorkflowState;
  executionHistory: ExecutionRecord[];
  artifacts: ArtifactRegistry;
  checkpoints: Checkpoint[];
  autoCheckpointEnabled: boolean;

  // React Flow event handlers
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  // Node operations
  addNode: (type: AgentRole, position: { x: number; y: number }) => void;
  addNodes: (nodes: WorkflowNode[]) => void;
  addEdges: (edges: WorkflowEdge[]) => void;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<WorkflowNode['data']>) => void;
  updateEdgeData: (edgeId: string, data: Partial<WorkflowEdge['data']>) => void;

  // Workflow operations
  createNewWorkflow: (name: string, mode: OrchestrationMode) => void;
  loadWorkflow: (workflow: WorkflowGraph) => void;
  saveCurrentWorkflow: () => WorkflowGraph | null;
  clearWorkflow: () => void;

  // Validation
  validateWorkflow: () => void;

  // Serialization & Export
  exportAsMarkdown: (options: SerializationOptions) => string;
  exportAsMultiAgentPackage: (config: OrchestratorConfig) => ReturnType<typeof generateMultiAgentPackage>;

  // Checkpointing operations
  createCheckpoint: (description: string, tags?: string[]) => Checkpoint;
  restoreFromCheckpoint: (checkpointId: string) => boolean;
  listCheckpoints: () => Checkpoint[];
  deleteCheckpoint: (checkpointId: string) => void;
  clearCheckpoints: () => void;
  toggleAutoCheckpoint: () => void;
  exportCheckpoint: (checkpointId: string) => string | null;
  importCheckpoint: (json: string) => boolean;

  // Execution tracking
  recordAgentExecution: (record: ExecutionRecord) => void;
  addArtifact: (artifactId: string, metadata: Omit<ArtifactRegistry[string], 'id'>) => void;
  updateWorkflowState: (updates: Partial<WorkflowState>) => void;

  // Artifact versioning operations
  createVersionedArtifact: (params: {
    path: string;
    content: unknown;
    createdBy: string;
    derivedFrom?: string[];
    schema?: ArtifactSchema;
    contentType?: string;
    tags?: string[];
    description?: string;
    critical?: boolean;
  }) => VersionedArtifact;
  updateVersionedArtifact: (params: {
    path: string;
    content: unknown;
    updatedBy: string;
    description?: string;
  }) => VersionedArtifact;
  getVersionedArtifact: (idOrPath: string, version?: number) => VersionedArtifact | null;
  getArtifactVersionHistory: (path: string) => VersionHistory | null;
  getArtifactLineage: (artifactId: string) => LineageNode | null;
  registerArtifactSchema: (schema: ArtifactSchema) => void;

  // Evaluation framework operations
  getTestSuite: (suiteId: string) => TestSuite | null;
  getTestResult: (suiteId: string) => TestSuiteResult | null;
  getABTestResult: (testId: string) => ABTestResult | null;

  // Group chat operations
  createGroupChat: (params: {
    name: string;
    description?: string;
    participants: Omit<GroupChatParticipant, 'messagesSent' | 'consecutiveTurns'>[];
    selectionStrategy?: SpeakerSelectionStrategy;
    terminationConditions?: TerminationCondition[];
    maxRounds?: number;
  }) => GroupChatConfig;
  startGroupChat: (chatId: string, initialMessage?: string) => void;
  addChatMessage: (chatId: string, message: Omit<GroupChatMessage, 'id' | 'timestamp'>) => GroupChatMessage;
  selectNextSpeaker: (chatId: string) => SpeakerSelectionResult;
  shouldTerminateChat: (chatId: string) => { shouldTerminate: boolean; reason?: string };
  terminateGroupChat: (chatId: string, reason: string) => void;
  getGroupChat: (chatId: string) => GroupChatConfig | null;
  getChatHistory: (chatId: string, lastN?: number) => GroupChatMessage[];
  getChatParticipantStats: (chatId: string) => Array<{
    participant: GroupChatParticipant;
    messagesSent: number;
    avgResponseTimeMs: number;
    totalTokensUsed: number;
  }>;

  // Workflow simulation operations
  runSimulation: (config: SimulationConfig) => Promise<SimulationResult>;
  getSimulation: (simulationId: string) => SimulationResult | null;

  // A/B testing operations
  createVariant: (params: { name: string; promptTemplate: string; description?: string }) => PromptVariant;
  getABTest: (testId: string) => ABTestConfig | null;
  getTestResult: (testId: string) => ABTestResult | null;
  getTestsForNode: (nodeId: string) => ABTestConfig[];

  // A2A Protocol operations
  registerA2AProtocol: (config: ProtocolConfig) => void;
  listA2AProtocols: () => ProtocolConfig[];
  createA2AChannel: (params: {
    name: string;
    protocol: ProtocolType;
    participants: string[];
    persistent?: boolean;
    maxHistory?: number;
    allowBroadcast?: boolean;
  }) => CommunicationChannel;
  listA2AChannels: () => CommunicationChannel[];
  getA2AChannel: (channelId: string) => CommunicationChannel | undefined;
  closeA2AChannel: (channelId: string) => boolean;
  sendA2AMessage: (params: {
    from: string;
    to: string | string[];
    protocol: ProtocolType;
    type: string;
    method?: string;
    payload: any;
    priority?: MessagePriority;
    requiresAck?: boolean;
    channelId?: string;
  }) => A2AMessage;
  broadcastA2AMessage: (params: {
    from: string;
    channelId: string;
    type: string;
    payload: any;
    priority?: MessagePriority;
  }) => A2AMessage | null;
  getA2AMessages: (agentId: string, options?: { limit?: number }) => A2AMessage[];
  getA2AChannelHistory: (channelId: string, limit?: number) => A2AMessage[];
  acknowledgeA2AMessage: (messageId: string, agentId: string) => boolean;
  getA2AStats: () => {
    totalProtocols: number;
    totalChannels: number;
    activeChannels: number;
    totalMessages: number;
  };

  // Conflict Resolution operations
  detectArtifactConflict: (params: {
    artifactPath: string;
    currentVersion: VersionedArtifact;
    incomingVersion: VersionedArtifact;
    baseVersion?: VersionedArtifact;
  }) => ArtifactConflict | null;
  resolveArtifactConflict: (params: {
    conflictId: string;
    strategy: ResolutionStrategy;
    resolvedBy: string;
    manualContent?: unknown;
  }) => ConflictResolution;
  getAllConflicts: (filter?: {
    resolved?: boolean;
    artifactPath?: string;
    severity?: ConflictSeverity;
  }) => ArtifactConflict[];
  getConflict: (conflictId: string) => ArtifactConflict | null;
  calculateArtifactDiff: (v1: VersionedArtifact, v2: VersionedArtifact) => ArtifactDiff;
  getConflictResolutionStats: () => {
    totalConflicts: number;
    resolvedConflicts: number;
    unresolvedConflicts: number;
    conflictsBySeverity: Record<ConflictSeverity, number>;
  };
  clearResolvedConflicts: () => number;

  // Execution Monitoring operations
  startExecutionSession: (params: {
    workflowId: string;
    workflowName: string;
  }) => ExecutionSession;
  getExecutionSession: (sessionId: string) => ExecutionSession | null;
  getActiveExecutionSession: () => ExecutionSession | null;
  getExecutionLogs: (sessionId: string, filter?: { level?: LogLevel; limit?: number }) => ExecutionLog[];
  pauseExecution: (sessionId: string) => void;
  resumeExecution: (sessionId: string) => void;
  cancelExecution: (sessionId: string) => void;

  // Template Marketplace operations
  getAllTemplates: () => WorkflowTemplate[];
  searchTemplates: (filter?: TemplateFilter) => WorkflowTemplate[];
  getTemplate: (templateId: string) => WorkflowTemplate | null;
  getFeaturedTemplates: () => WorkflowTemplate[];
  getPopularTemplates: (limit?: number) => WorkflowTemplate[];
  importTemplateToCanvas: (templateId: string) => boolean;
  exportCurrentAsTemplate: (metadata: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt' | 'downloads' | 'usageCount' | 'nodes' | 'edges'>, options?: TemplateExportOptions) => string;
  toggleTemplateFavorite: (templateId: string) => boolean;
  isFavoriteTemplate: (templateId: string) => boolean;
  getTemplateMarketplaceStats: () => ReturnType<typeof workflowTemplateMarketplace.getStats>;
}

export const useWorkflowStore = create<WorkflowStore>()(
  persist(
    (set, get) => ({
  currentWorkflow: null,
  nodes: [],
  edges: [],
  validation: null,
  suggestions: [],

  // Checkpointing state
  workflowState: {
    currentPhase: 'planning',
    sharedState: {},
    decisions: [],
  },
  executionHistory: [],
  artifacts: {},
  checkpoints: [],
  autoCheckpointEnabled: true,

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
    // Auto-validate on changes
    get().validateWorkflow();
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
    // Auto-validate on changes
    get().validateWorkflow();
  },

  onConnect: (connection) => {
    set({ edges: addEdge(connection, get().edges) });
    // Auto-validate on changes
    get().validateWorkflow();
  },

  addNode: (typeOrId, position) => {
    // Try to get template from agent registry first (supports custom agents)
    let template = agentRegistry.getAgent(typeOrId);

    // Fall back to built-in templates if not found in registry
    if (!template) {
      template = getAgentTemplate(typeOrId as AgentRole);
    }

    if (!template) {
      console.error(`No template found for agent: ${typeOrId}`);
      return;
    }

    const newNode: WorkflowNode = {
      id: `${typeOrId}-${Date.now()}`,
      type: 'default',
      position,
      data: {
        label: template.name,
        role: template.role,
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

    set({ nodes: [...get().nodes, newNode] });
    get().validateWorkflow();
  },

  addNodes: (nodes) => {
    set({ nodes: [...get().nodes, ...nodes] });
    get().validateWorkflow();
  },

  addEdges: (edges) => {
    set({ edges: [...get().edges, ...edges] });
    get().validateWorkflow();
  },

  deleteNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    });
    get().validateWorkflow();
  },

  deleteEdge: (edgeId) => {
    set({
      edges: get().edges.filter((e) => e.id !== edgeId),
    });
    get().validateWorkflow();
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    });
    get().validateWorkflow();
  },

  updateEdgeData: (edgeId, data) => {
    set({
      edges: get().edges.map((edge) => {
        if (edge.id !== edgeId) return edge;

        // Merge user data with existing edge data
        const mergedData = { ...edge.data, ...data };

        // Apply smart defaults for any undefined properties
        const updatedData = mergeWithDefaults(mergedData);

        // Validate edge data (non-blocking, just log warnings)
        const validation = validateEdgeData(updatedData, get().nodes);
        if (!validation.isValid) {
          console.warn(`Edge ${edgeId} validation issues:`, validation.errors);
        }
        if (validation.warnings.length > 0) {
          console.info(`Edge ${edgeId} validation warnings:`, validation.warnings);
        }

        const updatedEdge: WorkflowEdge = {
          ...edge,
          data: updatedData,
          // Sync label to top-level for React Flow rendering
          label: data.label !== undefined ? data.label : edge.label,
        };

        // Apply loop-specific styling
        if (updatedData.isLoopEdge && updatedData.loopRole) {
          const loopStyles = {
            entry: { stroke: '#3b82f6', strokeWidth: 3, strokeDasharray: '5,5' },    // Blue dashed
            iterate: { stroke: '#10b981', strokeWidth: 3, strokeDasharray: '0' },    // Green solid
            return: { stroke: '#f59e0b', strokeWidth: 3, strokeDasharray: '5,5' },   // Amber dashed
            exit: { stroke: '#ef4444', strokeWidth: 3, strokeDasharray: '10,5' },    // Red dashed
          };
          updatedEdge.style = loopStyles[updatedData.loopRole];
          updatedEdge.animated = updatedData.loopRole === 'iterate' || updatedData.loopRole === 'return';
        } else {
          // Reset to default styling if no longer a loop edge
          updatedEdge.style = { stroke: '#94a3b8', strokeWidth: 2 };
          updatedEdge.animated = false;
        }

        return updatedEdge;
      }),
    });
    get().validateWorkflow();
  },

  createNewWorkflow: (name, mode) => {
    const workflow: WorkflowGraph = {
      id: crypto.randomUUID(),
      name,
      description: '',
      mode,
      nodes: [],
      edges: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    set({
      currentWorkflow: workflow,
      nodes: [],
      edges: [],
      validation: null,
      suggestions: [],
    });
  },

  loadWorkflow: (workflow) => {
    set({
      currentWorkflow: workflow,
      nodes: workflow.nodes,
      edges: workflow.edges,
    });
    get().validateWorkflow();
  },

  saveCurrentWorkflow: () => {
    const { currentWorkflow, nodes, edges } = get();

    if (!currentWorkflow) {
      // Create new workflow if none exists
      const workflow: WorkflowGraph = {
        id: crypto.randomUUID(),
        name: 'Untitled Workflow',
        description: '',
        mode: 'orchestrator',
        nodes,
        edges,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      set({ currentWorkflow: workflow });
      return workflow;
    }

    const updated: WorkflowGraph = {
      ...currentWorkflow,
      nodes,
      edges,
      updatedAt: Date.now(),
    };

    set({ currentWorkflow: updated });
    return updated;
  },

  clearWorkflow: () => {
    set({
      nodes: [],
      edges: [],
      validation: null,
      suggestions: [],
    });
  },

  validateWorkflow: () => {
    const { nodes, edges, currentWorkflow } = get();

    if (nodes.length === 0) {
      set({
        validation: { valid: true, errors: [], warnings: [] },
        suggestions: [],
      });
      return;
    }

    const graph: WorkflowGraph = {
      id: currentWorkflow?.id || 'temp',
      name: currentWorkflow?.name || 'Temp',
      mode: currentWorkflow?.mode || 'orchestrator',
      nodes,
      edges,
      createdAt: currentWorkflow?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    const validation = validateWorkflowGraph(graph);
    const suggestions = getValidationSuggestions(graph);

    set({ validation, suggestions });
  },

  exportAsMarkdown: (options) => {
    const { nodes, edges, currentWorkflow } = get();

    const graph: WorkflowGraph = {
      id: currentWorkflow?.id || crypto.randomUUID(),
      name: currentWorkflow?.name || 'Workflow',
      mode: options.mode,
      nodes,
      edges,
      createdAt: currentWorkflow?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    return serializeWorkflowGraph(graph, options);
  },

  exportAsMultiAgentPackage: (config) => {
    const { nodes, edges, currentWorkflow } = get();

    const graph: WorkflowGraph = {
      id: currentWorkflow?.id || crypto.randomUUID(),
      name: currentWorkflow?.name || 'Workflow',
      mode: currentWorkflow?.mode || 'orchestrator',
      nodes,
      edges,
      createdAt: currentWorkflow?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    return generateMultiAgentPackage(graph, config);
  },

  // Checkpointing operations
  createCheckpoint: (description, tags) => {
    const {
      currentWorkflow,
      nodes,
      edges,
      workflowState,
      executionHistory,
      artifacts,
      autoCheckpointEnabled,
    } = get();

    if (!currentWorkflow) {
      console.warn('Cannot create checkpoint: no active workflow');
      return null as unknown as Checkpoint;
    }

    // Determine current and pending agents
    const executedAgents = new Set(executionHistory.map(record => record.agentId));
    const currentAgent = executionHistory.length > 0
      ? executionHistory[executionHistory.length - 1].agentId
      : null;
    const pendingAgents = nodes
      .filter(node => !executedAgents.has(node.id))
      .map(node => node.id);

    const checkpoint = saveCheckpoint({
      workflowId: currentWorkflow.id,
      workflowState,
      nodes,
      edges,
      executionHistory,
      currentAgent,
      pendingAgents,
      artifacts,
      description,
      tags,
    });

    // Update local checkpoint list
    const newCheckpoints = [...get().checkpoints, checkpoint];
    set({ checkpoints: newCheckpoints });

    return checkpoint;
  },

  restoreFromCheckpoint: (checkpointId) => {
    const result = resumeFromCheckpoint(checkpointId);

    if (!result.success || !result.checkpoint) {
      console.error('Failed to restore checkpoint:', checkpointId);
      return false;
    }

    const checkpoint = result.checkpoint;

    // Restore workflow state
    set({
      nodes: checkpoint.nodes,
      edges: checkpoint.edges,
      workflowState: checkpoint.workflowState,
      executionHistory: checkpoint.executionHistory,
      artifacts: checkpoint.artifacts,
    });

    // Validate restored workflow
    get().validateWorkflow();

    return true;
  },

  listCheckpoints: () => {
    const { currentWorkflow } = get();
    if (!currentWorkflow) return [];

    return checkpointManager.listCheckpoints(currentWorkflow.id);
  },

  deleteCheckpoint: (checkpointId) => {
    checkpointManager.deleteCheckpoint(checkpointId);

    // Update local checkpoint list
    set({
      checkpoints: get().checkpoints.filter(cp => cp.id !== checkpointId),
    });
  },

  clearCheckpoints: () => {
    const { currentWorkflow } = get();
    if (currentWorkflow) {
      checkpointManager.clearWorkflowCheckpoints(currentWorkflow.id);
    }
    set({ checkpoints: [] });
  },

  toggleAutoCheckpoint: () => {
    set({ autoCheckpointEnabled: !get().autoCheckpointEnabled });
  },

  exportCheckpoint: (checkpointId) => {
    const checkpoint = checkpointManager.restoreCheckpoint(checkpointId);
    if (!checkpoint) return null;

    return checkpointManager.exportCheckpoint(checkpoint);
  },

  importCheckpoint: (json) => {
    const checkpoint = checkpointManager.importCheckpoint(json);
    if (!checkpoint) return false;

    // Add to local checkpoint list if it's for the current workflow
    const { currentWorkflow } = get();
    if (currentWorkflow && checkpoint.workflowId === currentWorkflow.id) {
      set({ checkpoints: [...get().checkpoints, checkpoint] });
    }

    return true;
  },

  // Execution tracking
  recordAgentExecution: (record) => {
    const newHistory = [...get().executionHistory, record];
    set({ executionHistory: newHistory });

    // Auto-checkpoint after agent execution if enabled
    const { autoCheckpointEnabled, currentWorkflow } = get();
    if (autoCheckpointEnabled && currentWorkflow) {
      get().createCheckpoint(
        `After ${record.agentRole} execution`,
        ['auto', 'post-agent', record.agentRole]
      );
    }
  },

  addArtifact: (artifactId, metadata) => {
    const newArtifacts = {
      ...get().artifacts,
      [artifactId]: { id: artifactId, ...metadata },
    };
    set({ artifacts: newArtifacts });
  },

  updateWorkflowState: (updates) => {
    const newState = {
      ...get().workflowState,
      ...updates,
    };
    set({ workflowState: newState });
  },

  // Artifact versioning operations
  createVersionedArtifact: (params) => {
    const artifact = artifactVersionManager.createArtifact(params);

    // Also add to basic artifact registry for checkpoint compatibility
    const basicMetadata = {
      path: artifact.path,
      createdBy: artifact.createdBy,
      createdAt: artifact.createdAt,
      version: artifact.version,
      hash: artifact.hash,
      derivedFrom: artifact.derivedFrom,
      schema: artifact.schema?.id,
      contentType: artifact.contentType,
    };

    get().addArtifact(artifact.id, basicMetadata);

    return artifact;
  },

  updateVersionedArtifact: (params) => {
    const artifact = artifactVersionManager.updateArtifact(params);

    // Update basic artifact registry
    const basicMetadata = {
      path: artifact.path,
      createdBy: artifact.createdBy,
      createdAt: artifact.createdAt,
      version: artifact.version,
      hash: artifact.hash,
      derivedFrom: artifact.derivedFrom,
      schema: artifact.schema?.id,
      contentType: artifact.contentType,
    };

    get().addArtifact(artifact.id, basicMetadata);

    return artifact;
  },

  getVersionedArtifact: (idOrPath, version) => {
    return artifactVersionManager.getArtifact(idOrPath, version);
  },

  getArtifactVersionHistory: (path) => {
    return artifactVersionManager.getVersionHistory(path);
  },

  getArtifactLineage: (artifactId) => {
    return artifactVersionManager.getLineage(artifactId);
  },

  registerArtifactSchema: (schema) => {
    artifactVersionManager.registerSchema(schema);
  },

  // Evaluation framework operations
  getTestSuite: (suiteId) => {
    return evaluationFramework.getTestSuite(suiteId);
  },

  getTestResult: (suiteId) => {
    return evaluationFramework.getTestResult(suiteId);
  },

  getABTestResult: (testId) => {
    return evaluationFramework.getABTestResult(testId);
  },

  // Group chat operations
  createGroupChat: (params) => {
    return groupChatManager.createGroupChat(params);
  },

  startGroupChat: (chatId, initialMessage) => {
    groupChatManager.startGroupChat(chatId, initialMessage);
  },

  addChatMessage: (chatId, message) => {
    return groupChatManager.addMessage(chatId, message);
  },

  selectNextSpeaker: (chatId) => {
    const state = get().workflowState;
    return groupChatManager.selectNextSpeaker(chatId, state);
  },

  shouldTerminateChat: (chatId) => {
    const state = get().workflowState;
    return groupChatManager.shouldTerminate(chatId, state);
  },

  terminateGroupChat: (chatId, reason) => {
    groupChatManager.terminateGroupChat(chatId, reason);
  },

  getGroupChat: (chatId) => {
    return groupChatManager.getGroupChat(chatId);
  },

  getChatHistory: (chatId, lastN) => {
    return groupChatManager.getConversationHistory(chatId, lastN);
  },

  getChatParticipantStats: (chatId) => {
    return groupChatManager.getParticipantStats(chatId);
  },

  // Workflow simulation operations
  runSimulation: async (config) => {
    const workflow = get().currentWorkflow;
    if (!workflow) {
      throw new Error('No workflow loaded');
    }

    const workflowGraph: WorkflowGraph = {
      ...workflow,
      nodes: get().nodes,
      edges: get().edges,
    };

    return await workflowSimulator.startSimulation(workflowGraph, config);
  },

  getSimulation: (simulationId) => {
    return workflowSimulator.getSimulation(simulationId);
  },

  // A/B testing operations
  createVariant: (params) => {
    return promptABTestingManager.createVariant(params);
  },

  getABTest: (testId) => {
    return promptABTestingManager.getABTest(testId);
  },

  getTestResult: (testId) => {
    return promptABTestingManager.getTestResult(testId);
  },

  getTestsForNode: (nodeId) => {
    return promptABTestingManager.getTestsForNode(nodeId);
  },

  // A2A Protocol operations
  registerA2AProtocol: (config) => {
    a2aProtocolManager.registerProtocol(config);
  },

  listA2AProtocols: () => {
    return a2aProtocolManager.listProtocols();
  },

  createA2AChannel: (params) => {
    return a2aProtocolManager.createChannel(params);
  },

  listA2AChannels: () => {
    return a2aProtocolManager.listChannels();
  },

  getA2AChannel: (channelId) => {
    return a2aProtocolManager.getChannel(channelId);
  },

  closeA2AChannel: (channelId) => {
    return a2aProtocolManager.closeChannel(channelId);
  },

  sendA2AMessage: (params) => {
    return a2aProtocolManager.sendMessage(params);
  },

  broadcastA2AMessage: (params) => {
    return a2aProtocolManager.broadcast(params);
  },

  getA2AMessages: (agentId, options) => {
    return a2aProtocolManager.getMessages(agentId, options);
  },

  getA2AChannelHistory: (channelId, limit) => {
    return a2aProtocolManager.getChannelHistory(channelId, limit);
  },

  acknowledgeA2AMessage: (messageId, agentId) => {
    return a2aProtocolManager.acknowledgeMessage(messageId, agentId);
  },

  getA2AStats: () => {
    return a2aProtocolManager.getStats();
  },

  // Conflict Resolution operations
  detectArtifactConflict: (params) => {
    return conflictResolutionManager.detectConflict(params);
  },

  resolveArtifactConflict: (params) => {
    return conflictResolutionManager.resolveConflict(params);
  },

  getAllConflicts: (filter) => {
    return conflictResolutionManager.getAllConflicts(filter);
  },

  getConflict: (conflictId) => {
    return conflictResolutionManager.getConflict(conflictId);
  },

  calculateArtifactDiff: (v1, v2) => {
    return conflictResolutionManager.calculateDiff(v1, v2);
  },

  getConflictResolutionStats: () => {
    return conflictResolutionManager.getStats();
  },

  clearResolvedConflicts: () => {
    return conflictResolutionManager.clearResolvedConflicts();
  },

  // Execution Monitoring operations
  startExecutionSession: (params) => {
    const { nodes, currentWorkflow } = get();
    return executionMonitor.startSession({
      workflowId: currentWorkflow?.id || 'unknown',
      workflowName: params.workflowName,
      agents: nodes,
    });
  },

  getExecutionSession: (sessionId) => {
    return executionMonitor.getSession(sessionId);
  },

  getActiveExecutionSession: () => {
    return executionMonitor.getActiveSession();
  },

  getExecutionLogs: (sessionId, filter) => {
    return executionMonitor.getLogs(sessionId, filter);
  },

  pauseExecution: (sessionId) => {
    executionMonitor.pauseSession(sessionId);
  },

  resumeExecution: (sessionId) => {
    executionMonitor.resumeSession(sessionId);
  },

  cancelExecution: (sessionId) => {
    executionMonitor.cancelSession(sessionId);
  },

  // Template Marketplace operations
  getAllTemplates: () => {
    return workflowTemplateMarketplace.getAllTemplates();
  },

  searchTemplates: (filter) => {
    return workflowTemplateMarketplace.searchTemplates(filter);
  },

  getTemplate: (templateId) => {
    return workflowTemplateMarketplace.getTemplate(templateId);
  },

  getFeaturedTemplates: () => {
    return workflowTemplateMarketplace.getFeaturedTemplates();
  },

  getPopularTemplates: (limit) => {
    return workflowTemplateMarketplace.getPopularTemplates(limit);
  },

  importTemplateToCanvas: (templateId) => {
    const result = workflowTemplateMarketplace.importTemplate(templateId, {
      preserveIds: false,
      position: { x: 100, y: 100 },
    });

    if (result) {
      const { nodes, edges } = get();
      set({
        nodes: [...nodes, ...result.nodes],
        edges: [...edges, ...result.edges],
      });
      return true;
    }
    return false;
  },

  exportCurrentAsTemplate: (metadata, options) => {
    const { nodes, edges } = get();
    return workflowTemplateMarketplace.exportTemplate(nodes, edges, metadata, options);
  },

  toggleTemplateFavorite: (templateId) => {
    const isFav = workflowTemplateMarketplace.isFavorite(templateId);
    if (isFav) {
      return workflowTemplateMarketplace.removeFavorite(templateId);
    } else {
      return workflowTemplateMarketplace.addFavorite(templateId);
    }
  },

  isFavoriteTemplate: (templateId) => {
    return workflowTemplateMarketplace.isFavorite(templateId);
  },

  getTemplateMarketplaceStats: () => {
    return workflowTemplateMarketplace.getStats();
  },
}),
    {
      name: 'workflow-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Persist critical workflow state
      partialize: (state) => ({
        currentWorkflow: state.currentWorkflow,
        nodes: state.nodes,
        edges: state.edges,
        workflowState: state.workflowState,
        executionHistory: state.executionHistory,
        artifacts: state.artifacts,
        checkpoints: state.checkpoints,
        autoCheckpointEnabled: state.autoCheckpointEnabled,
      }),
      // Version for migration support
      version: 1,
      // Rehydrate and validate on load
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('Workflow state rehydrated from localStorage');
          // Re-validate workflow after rehydration
          state.validateWorkflow();
        }
      },
    }
  )
);
