/**
 * State Persistence & Checkpointing System
 * Inspired by LangGraph explicit checkpointing (2024-2025)
 *
 * Enables:
 * - Checkpoint snapshots at agent boundaries
 * - Resume-from-checkpoint for interrupted workflows
 * - Workflow state versioning and lineage tracking
 * - Rollback to previous states
 */

import type { Node, Edge } from 'reactflow';
import type { AgentNodeData, WorkflowEdgeData, WorkflowState } from '@/types/workflow';

/**
 * Checkpoint metadata and state snapshot
 */
export interface Checkpoint {
  // Identification
  id: string; // checkpoint-[timestamp]-[hash]
  workflowId: string;
  timestamp: number; // Unix timestamp
  version: string; // Checkpoint format version (e.g., "1.0.0")

  // Workflow snapshot
  workflowState: WorkflowState;
  nodes: Node<AgentNodeData>[];
  edges: Edge<WorkflowEdgeData>[];

  // Execution state
  executionHistory: ExecutionRecord[];
  currentAgent: string | null; // Node ID of currently executing agent
  pendingAgents: string[]; // Node IDs not yet executed

  // Artifacts
  artifacts: ArtifactRegistry;

  // Metadata
  description?: string; // User-provided description
  tags?: string[]; // For categorization (e.g., ["pre-critic", "iteration-2"])
  automatic: boolean; // Auto-saved vs manual checkpoint
}

/**
 * Record of agent execution
 */
export interface ExecutionRecord {
  agentId: string; // Node ID
  agentRole: string; // orchestrator, architect, etc.
  startTime: number;
  endTime: number;
  status: 'success' | 'failure' | 'skipped' | 'interrupted';
  artifactsCreated: string[]; // Artifact IDs
  artifactsConsumed: string[]; // Artifact IDs
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Artifact registry tracking all created artifacts
 */
export interface ArtifactRegistry {
  [artifactId: string]: ArtifactMetadata;
}

export interface ArtifactMetadata {
  id: string; // Unique artifact ID
  path: string; // File path or reference
  createdBy: string; // Agent node ID
  createdAt: number; // Timestamp
  version: number; // Incremental version number
  hash?: string; // Content hash for validation
  derivedFrom?: string[]; // Parent artifact IDs
  schema?: string; // JSON schema if applicable
  contentType?: string; // MIME type or file extension
}

/**
 * Checkpoint storage configuration
 */
export interface CheckpointConfig {
  storageDir: string; // Directory for checkpoint files
  maxCheckpoints?: number; // Maximum checkpoints to keep per workflow
  autoCheckpoint?: boolean; // Enable auto-checkpointing at agent boundaries
  compressionEnabled?: boolean; // Compress checkpoint files
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: CheckpointConfig = {
  storageDir: 'artifacts/workflow-state',
  maxCheckpoints: 10,
  autoCheckpoint: true,
  compressionEnabled: false,
};

/**
 * Checkpointing manager
 */
export class CheckpointManager {
  private config: CheckpointConfig;
  private checkpoints: Map<string, Checkpoint[]>; // workflowId -> checkpoints

  constructor(config: Partial<CheckpointConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.checkpoints = new Map();
  }

  /**
   * Create a checkpoint snapshot
   */
  createCheckpoint(params: {
    workflowId: string;
    workflowState: WorkflowState;
    nodes: Node<AgentNodeData>[];
    edges: Edge<WorkflowEdgeData>[];
    executionHistory: ExecutionRecord[];
    currentAgent: string | null;
    pendingAgents: string[];
    artifacts: ArtifactRegistry;
    description?: string;
    tags?: string[];
    automatic?: boolean;
  }): Checkpoint {
    const timestamp = Date.now();
    const hash = this.generateHash(`${params.workflowId}-${timestamp}`);
    const id = `checkpoint-${timestamp}-${hash}`;

    const checkpoint: Checkpoint = {
      id,
      workflowId: params.workflowId,
      timestamp,
      version: '1.0.0',
      workflowState: params.workflowState,
      nodes: params.nodes,
      edges: params.edges,
      executionHistory: params.executionHistory,
      currentAgent: params.currentAgent,
      pendingAgents: params.pendingAgents,
      artifacts: params.artifacts,
      description: params.description,
      tags: params.tags,
      automatic: params.automatic ?? true,
    };

    // Store checkpoint
    const workflowCheckpoints = this.checkpoints.get(params.workflowId) || [];
    workflowCheckpoints.push(checkpoint);

    // Apply retention policy
    if (this.config.maxCheckpoints && workflowCheckpoints.length > this.config.maxCheckpoints) {
      // Keep only most recent checkpoints
      workflowCheckpoints.splice(0, workflowCheckpoints.length - this.config.maxCheckpoints);
    }

    this.checkpoints.set(params.workflowId, workflowCheckpoints);

    return checkpoint;
  }

  /**
   * Restore workflow from checkpoint
   */
  restoreCheckpoint(checkpointId: string): Checkpoint | null {
    for (const [, workflowCheckpoints] of this.checkpoints) {
      const checkpoint = workflowCheckpoints.find(cp => cp.id === checkpointId);
      if (checkpoint) {
        return checkpoint;
      }
    }
    return null;
  }

  /**
   * Get latest checkpoint for workflow
   */
  getLatestCheckpoint(workflowId: string): Checkpoint | null {
    const workflowCheckpoints = this.checkpoints.get(workflowId);
    if (!workflowCheckpoints || workflowCheckpoints.length === 0) {
      return null;
    }
    return workflowCheckpoints[workflowCheckpoints.length - 1];
  }

  /**
   * List all checkpoints for workflow
   */
  listCheckpoints(workflowId: string): Checkpoint[] {
    return this.checkpoints.get(workflowId) || [];
  }

  /**
   * Delete a specific checkpoint
   */
  deleteCheckpoint(checkpointId: string): boolean {
    for (const [workflowId, workflowCheckpoints] of this.checkpoints) {
      const index = workflowCheckpoints.findIndex(cp => cp.id === checkpointId);
      if (index !== -1) {
        workflowCheckpoints.splice(index, 1);
        this.checkpoints.set(workflowId, workflowCheckpoints);
        return true;
      }
    }
    return false;
  }

  /**
   * Delete all checkpoints for workflow
   */
  clearWorkflowCheckpoints(workflowId: string): void {
    this.checkpoints.delete(workflowId);
  }

  /**
   * Export checkpoint to JSON file
   */
  exportCheckpoint(checkpoint: Checkpoint): string {
    const filename = `${this.config.storageDir}/${checkpoint.id}.json`;
    const json = JSON.stringify(checkpoint, null, 2);
    // In browser environment, this would trigger a download
    // In Node.js environment, write to filesystem
    return json;
  }

  /**
   * Import checkpoint from JSON
   */
  importCheckpoint(json: string): Checkpoint | null {
    try {
      const checkpoint = JSON.parse(json) as Checkpoint;

      // Validate checkpoint structure
      if (!this.validateCheckpoint(checkpoint)) {
        console.error('Invalid checkpoint structure');
        return null;
      }

      // Store checkpoint
      const workflowCheckpoints = this.checkpoints.get(checkpoint.workflowId) || [];
      workflowCheckpoints.push(checkpoint);
      this.checkpoints.set(checkpoint.workflowId, workflowCheckpoints);

      return checkpoint;
    } catch (error) {
      console.error('Failed to import checkpoint:', error);
      return null;
    }
  }

  /**
   * Get checkpoint diff (what changed between two checkpoints)
   */
  getCheckpointDiff(checkpoint1Id: string, checkpoint2Id: string): CheckpointDiff | null {
    const cp1 = this.restoreCheckpoint(checkpoint1Id);
    const cp2 = this.restoreCheckpoint(checkpoint2Id);

    if (!cp1 || !cp2) {
      return null;
    }

    return {
      timeDelta: cp2.timestamp - cp1.timestamp,
      newAgentsExecuted: cp2.executionHistory.length - cp1.executionHistory.length,
      newArtifacts: Object.keys(cp2.artifacts).filter(id => !(id in cp1.artifacts)),
      stateChanges: this.compareWorkflowStates(cp1.workflowState, cp2.workflowState),
    };
  }

  /**
   * Validate checkpoint structure
   */
  private validateCheckpoint(checkpoint: Checkpoint): boolean {
    return (
      typeof checkpoint.id === 'string' &&
      typeof checkpoint.workflowId === 'string' &&
      typeof checkpoint.timestamp === 'number' &&
      typeof checkpoint.version === 'string' &&
      Array.isArray(checkpoint.nodes) &&
      Array.isArray(checkpoint.edges) &&
      Array.isArray(checkpoint.executionHistory) &&
      Array.isArray(checkpoint.pendingAgents) &&
      typeof checkpoint.artifacts === 'object'
    );
  }

  /**
   * Generate simple hash for checkpoint ID
   */
  private generateHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 6);
  }

  /**
   * Compare workflow states for diff
   */
  private compareWorkflowStates(state1: WorkflowState, state2: WorkflowState): string[] {
    const changes: string[] = [];

    if (state1.currentPhase !== state2.currentPhase) {
      changes.push(`Phase: ${state1.currentPhase} → ${state2.currentPhase}`);
    }

    // Compare shared state keys
    const allKeys = new Set([...Object.keys(state1.sharedState), ...Object.keys(state2.sharedState)]);
    for (const key of allKeys) {
      const val1 = state1.sharedState[key];
      const val2 = state2.sharedState[key];
      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        changes.push(`State[${key}]: ${JSON.stringify(val1)} → ${JSON.stringify(val2)}`);
      }
    }

    return changes;
  }
}

/**
 * Checkpoint diff result
 */
export interface CheckpointDiff {
  timeDelta: number; // Milliseconds between checkpoints
  newAgentsExecuted: number; // Number of new agents executed
  newArtifacts: string[]; // New artifact IDs created
  stateChanges: string[]; // Description of state changes
}

/**
 * Auto-checkpointing hook for agent execution
 */
export function createAutoCheckpointHook(manager: CheckpointManager) {
  return {
    beforeAgent: (params: {
      workflowId: string;
      workflowState: WorkflowState;
      nodes: Node<AgentNodeData>[];
      edges: Edge<WorkflowEdgeData>[];
      executionHistory: ExecutionRecord[];
      currentAgent: string;
      pendingAgents: string[];
      artifacts: ArtifactRegistry;
    }) => {
      if (!manager['config'].autoCheckpoint) return;

      manager.createCheckpoint({
        ...params,
        description: `Before executing agent: ${params.currentAgent}`,
        tags: ['auto', 'pre-agent'],
        automatic: true,
      });
    },

    afterAgent: (params: {
      workflowId: string;
      workflowState: WorkflowState;
      nodes: Node<AgentNodeData>[];
      edges: Edge<WorkflowEdgeData>[];
      executionHistory: ExecutionRecord[];
      currentAgent: string | null;
      pendingAgents: string[];
      artifacts: ArtifactRegistry;
    }) => {
      if (!manager['config'].autoCheckpoint) return;

      manager.createCheckpoint({
        ...params,
        description: `After executing agent: ${params.currentAgent}`,
        tags: ['auto', 'post-agent'],
        automatic: true,
      });
    },

    onError: (params: {
      workflowId: string;
      workflowState: WorkflowState;
      nodes: Node<AgentNodeData>[];
      edges: Edge<WorkflowEdgeData>[];
      executionHistory: ExecutionRecord[];
      currentAgent: string | null;
      pendingAgents: string[];
      artifacts: ArtifactRegistry;
      error: Error;
    }) => {
      manager.createCheckpoint({
        ...params,
        description: `Error during execution: ${params.error.message}`,
        tags: ['auto', 'error', 'recovery-point'],
        automatic: true,
      });
    },
  };
}

/**
 * Singleton instance for convenience
 */
export const checkpointManager = new CheckpointManager();

/**
 * Resume workflow from checkpoint
 */
export function resumeFromCheckpoint(checkpointId: string): {
  success: boolean;
  checkpoint: Checkpoint | null;
  nextAgent: string | null;
} {
  const checkpoint = checkpointManager.restoreCheckpoint(checkpointId);

  if (!checkpoint) {
    return { success: false, checkpoint: null, nextAgent: null };
  }

  // Determine next agent to execute
  const nextAgent = checkpoint.currentAgent ||
                   (checkpoint.pendingAgents.length > 0 ? checkpoint.pendingAgents[0] : null);

  return {
    success: true,
    checkpoint,
    nextAgent,
  };
}

/**
 * Helper: Create manual checkpoint with custom description
 */
export function saveCheckpoint(params: {
  workflowId: string;
  workflowState: WorkflowState;
  nodes: Node<AgentNodeData>[];
  edges: Edge<WorkflowEdgeData>[];
  executionHistory: ExecutionRecord[];
  currentAgent: string | null;
  pendingAgents: string[];
  artifacts: ArtifactRegistry;
  description: string;
  tags?: string[];
}): Checkpoint {
  return checkpointManager.createCheckpoint({
    ...params,
    automatic: false,
  });
}
