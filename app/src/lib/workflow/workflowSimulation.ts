/**
 * Workflow Simulation & Dry-Run
 * Test workflow execution without actually running agents
 *
 * Features:
 * - Step-by-step simulation
 * - Conditional routing validation
 * - Artifact dependency checking
 * - Resource estimation (time, tokens, cost)
 * - Bottleneck identification
 * - State transition validation
 */

import type { WorkflowGraph, WorkflowNode, WorkflowEdge, WorkflowState } from '@/types/workflow';
import { conditionalRoutingManager } from './conditionalRouting';

/**
 * Simulation mode
 */
export type SimulationMode =
  | 'fast-forward' // Skip to results
  | 'step-by-step' // Pause at each step
  | 'breakpoints'; // Pause at specific nodes

/**
 * Simulation step
 */
export interface SimulationStep {
  stepNumber: number;
  timestamp: number;
  nodeId: string;
  nodeName: string;
  action: 'start' | 'execute' | 'complete' | 'skip' | 'error';

  // Inputs
  inputs: Record<string, unknown>;
  inputArtifacts: string[];

  // Outputs
  outputs?: Record<string, unknown>;
  outputArtifacts?: string[];
  mockResponse?: string;

  // Execution
  executionTimeMs: number;
  estimatedTokens: number;
  estimatedCost: number;

  // State
  stateBefore: WorkflowState;
  stateAfter: WorkflowState;

  // Decisions
  nextNodes: string[];
  routingDecision?: {
    edgeId: string;
    condition: string;
    conditionMet: boolean;
    reason: string;
  };

  // Warnings
  warnings: string[];
  errors: string[];
}

/**
 * Simulation result
 */
export interface SimulationResult {
  id: string;
  workflowId: string;
  startedAt: number;
  completedAt?: number;
  duration: number;

  // Execution
  steps: SimulationStep[];
  currentStep: number;
  totalSteps: number;

  // Status
  status: 'running' | 'paused' | 'completed' | 'failed';
  failureReason?: string;

  // Analysis
  executionOrder: string[]; // Node IDs in execution order
  parallelBlocks: string[][]; // Groups of nodes that can run in parallel
  criticalPath: string[]; // Longest path through workflow
  bottlenecks: Array<{
    nodeId: string;
    reason: string;
    impact: 'low' | 'medium' | 'high';
  }>;

  // Resource estimates
  totalEstimatedTime: number; // milliseconds
  totalEstimatedTokens: number;
  totalEstimatedCost: number; // USD
  peakParallelism: number; // max agents running simultaneously

  // Validation
  validationErrors: string[];
  validationWarnings: string[];

  // Coverage
  nodesCovered: string[]; // Nodes executed
  nodesSkipped: string[]; // Nodes not reached
  edgesCovered: string[]; // Edges traversed
  coveragePercentage: number;
}

/**
 * Simulation configuration
 */
export interface SimulationConfig {
  mode: SimulationMode;
  breakpoints?: string[]; // Node IDs to pause at

  // Mock data
  mockInputs?: Record<string, unknown>;
  mockArtifacts?: Record<string, unknown>;
  customNodeBehaviors?: Record<
    string,
    (inputs: Record<string, unknown>) => {
      outputs: Record<string, unknown>;
      artifacts: string[];
      executionTimeMs: number;
    }
  >;

  // Resource estimation
  tokenEstimates?: Record<string, number>; // Per node
  costPerToken?: number; // Default: $0.000015 (Claude Sonnet)

  // Constraints
  maxSteps?: number; // Prevent infinite loops
  timeout?: number; // Max simulation time
}

/**
 * Simulation event
 */
export interface SimulationEvent {
  type: 'step-start' | 'step-complete' | 'pause' | 'resume' | 'complete' | 'error';
  step?: SimulationStep;
  result?: SimulationResult;
  error?: string;
}

/**
 * Workflow Simulator
 */
export class WorkflowSimulator {
  private simulations: Map<string, SimulationResult>;
  private eventListeners: Map<string, Array<(event: SimulationEvent) => void>>;

  constructor() {
    this.simulations = new Map();
    this.eventListeners = new Map();
  }

  /**
   * Start simulation
   */
  async startSimulation(
    workflow: WorkflowGraph,
    config: SimulationConfig
  ): Promise<SimulationResult> {
    const result: SimulationResult = {
      id: `sim-${Date.now()}`,
      workflowId: workflow.id,
      startedAt: Date.now(),
      duration: 0,
      steps: [],
      currentStep: 0,
      totalSteps: 0,
      status: 'running',
      executionOrder: [],
      parallelBlocks: [],
      criticalPath: [],
      bottlenecks: [],
      totalEstimatedTime: 0,
      totalEstimatedTokens: 0,
      totalEstimatedCost: 0,
      peakParallelism: 0,
      validationErrors: [],
      validationWarnings: [],
      nodesCovered: [],
      nodesSkipped: [],
      edgesCovered: [],
      coveragePercentage: 0,
    };

    this.simulations.set(result.id, result);

    try {
      // Validate workflow structure
      this.validateWorkflow(workflow, result);

      if (result.validationErrors.length > 0) {
        result.status = 'failed';
        result.failureReason = 'Workflow validation failed';
        result.completedAt = Date.now();
        result.duration = result.completedAt - result.startedAt;
        return result;
      }

      // Find entry nodes (no incoming edges)
      const entryNodes = this.findEntryNodes(workflow);
      if (entryNodes.length === 0) {
        result.validationErrors.push('No entry nodes found');
        result.status = 'failed';
        result.failureReason = 'No entry nodes';
        result.completedAt = Date.now();
        result.duration = result.completedAt - result.startedAt;
        return result;
      }

      // Analyze execution graph
      this.analyzeExecutionGraph(workflow, result);

      // Initialize state
      const state: WorkflowState = {
        currentPhase: 'planning',
        sharedState: config.mockInputs || {},
        decisions: [],
      };

      // Execute simulation
      await this.executeSimulation(workflow, config, result, state, entryNodes);

      // Calculate coverage
      this.calculateCoverage(workflow, result);

      result.status = 'completed';
      result.completedAt = Date.now();
      result.duration = result.completedAt - result.startedAt;

      this.emitEvent(result.id, {
        type: 'complete',
        result,
      });
    } catch (error) {
      result.status = 'failed';
      result.failureReason = error instanceof Error ? error.message : 'Unknown error';
      result.completedAt = Date.now();
      result.duration = result.completedAt - result.startedAt;

      this.emitEvent(result.id, {
        type: 'error',
        error: result.failureReason,
      });
    }

    return result;
  }

  /**
   * Execute simulation steps
   */
  private async executeSimulation(
    workflow: WorkflowGraph,
    config: SimulationConfig,
    result: SimulationResult,
    state: WorkflowState,
    currentNodes: string[]
  ): Promise<void> {
    const visited = new Set<string>();
    const queue = [...currentNodes];
    const maxSteps = config.maxSteps || 1000;
    const artifacts = new Map<string, unknown>(Object.entries(config.mockArtifacts || {}));

    while (queue.length > 0 && result.steps.length < maxSteps) {
      const nodeId = queue.shift()!;

      // Skip if already visited (prevent cycles)
      if (visited.has(nodeId)) {
        continue;
      }
      visited.add(nodeId);

      const node = workflow.nodes.find(n => n.id === nodeId);
      if (!node) {
        result.validationWarnings.push(`Node not found: ${nodeId}`);
        continue;
      }

      // Create simulation step
      const step = await this.simulateNodeExecution(
        node,
        workflow,
        config,
        state,
        artifacts,
        result.steps.length + 1
      );

      result.steps.push(step);
      result.currentStep++;
      result.executionOrder.push(nodeId);
      result.nodesCovered.push(nodeId);

      // Update totals
      result.totalEstimatedTime += step.executionTimeMs;
      result.totalEstimatedTokens += step.estimatedTokens;
      result.totalEstimatedCost += step.estimatedCost;

      // Update state
      state = step.stateAfter;

      // Store output artifacts
      if (step.outputArtifacts) {
        step.outputArtifacts.forEach(artifactPath => {
          artifacts.set(artifactPath, step.outputs || {});
        });
      }

      // Emit step event
      this.emitEvent(result.id, {
        type: 'step-complete',
        step,
      });

      // Check for breakpoint
      if (config.breakpoints?.includes(nodeId)) {
        result.status = 'paused';
        this.emitEvent(result.id, {
          type: 'pause',
          result,
        });
        break;
      }

      // Find next nodes
      const outgoingEdges = workflow.edges.filter(e => e.source === nodeId);

      for (const edge of outgoingEdges) {
        result.edgesCovered.push(edge.id);

        // Evaluate edge condition if present
        if (edge.data?.condition) {
          const conditionMet = this.evaluateCondition(edge.data.condition, state);

          step.routingDecision = {
            edgeId: edge.id,
            condition: edge.data.condition,
            conditionMet,
            reason: conditionMet ? 'Condition satisfied' : 'Condition not satisfied',
          };

          if (!conditionMet) {
            continue;
          }
        }

        queue.push(edge.target);
        step.nextNodes.push(edge.target);
      }
    }

    // Check for max steps exceeded
    if (result.steps.length >= maxSteps) {
      result.validationWarnings.push(`Simulation exceeded max steps (${maxSteps})`);
    }
  }

  /**
   * Simulate node execution
   */
  private async simulateNodeExecution(
    node: WorkflowNode,
    workflow: WorkflowGraph,
    config: SimulationConfig,
    state: WorkflowState,
    artifacts: Map<string, unknown>,
    stepNumber: number
  ): Promise<SimulationStep> {
    const startTime = Date.now();

    // Get inputs from incoming edges
    const inputs: Record<string, unknown> = {};
    const inputArtifacts: string[] = [];

    const incomingEdges = workflow.edges.filter(e => e.target === node.id);
    incomingEdges.forEach(edge => {
      if (edge.data?.artifactRef) {
        inputArtifacts.push(edge.data.artifactRef);
        inputs[edge.data.artifactRef] = artifacts.get(edge.data.artifactRef) || null;
      }
    });

    // Use custom behavior if provided
    let outputs: Record<string, unknown> = {};
    let outputArtifacts: string[] = [];
    let executionTimeMs = 1000; // Default 1s
    let estimatedTokens = 500; // Default 500 tokens

    if (config.customNodeBehaviors?.[node.id]) {
      const behavior = config.customNodeBehaviors[node.id](inputs);
      outputs = behavior.outputs;
      outputArtifacts = behavior.artifacts;
      executionTimeMs = behavior.executionTimeMs;
    } else {
      // Generate mock outputs based on node type
      outputs = this.generateMockOutputs(node);
      outputArtifacts = node.data.outputs || [];
      executionTimeMs = this.estimateExecutionTime(node);
      estimatedTokens = config.tokenEstimates?.[node.id] || this.estimateTokens(node);
    }

    const estimatedCost = estimatedTokens * (config.costPerToken || 0.000015);

    // Update state
    const stateAfter: WorkflowState = {
      ...state,
      sharedState: {
        ...state.sharedState,
        [`${node.id}_output`]: outputs,
      },
      decisions: [
        ...state.decisions,
        {
          agentId: node.id,
          decision: `Executed ${node.data.label}`,
          rationale: 'Simulated execution',
          timestamp: Date.now(),
        },
      ],
    };

    const step: SimulationStep = {
      stepNumber,
      timestamp: startTime,
      nodeId: node.id,
      nodeName: node.data.label,
      action: 'complete',
      inputs,
      inputArtifacts,
      outputs,
      outputArtifacts,
      mockResponse: `Mock output from ${node.data.label}`,
      executionTimeMs,
      estimatedTokens,
      estimatedCost,
      stateBefore: state,
      stateAfter,
      nextNodes: [],
      warnings: [],
      errors: [],
    };

    // Validate inputs
    if (node.data.inputs && node.data.inputs.length > 0) {
      const missingInputs = node.data.inputs.filter(
        inp => !inputArtifacts.includes(inp) && !(inp in inputs)
      );
      if (missingInputs.length > 0) {
        step.warnings.push(`Missing inputs: ${missingInputs.join(', ')}`);
      }
    }

    return step;
  }

  /**
   * Validate workflow structure
   */
  private validateWorkflow(workflow: WorkflowGraph, result: SimulationResult): void {
    // Check for disconnected nodes
    const nodeIds = new Set(workflow.nodes.map(n => n.id));
    const connectedNodes = new Set<string>();

    workflow.edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    const disconnected = Array.from(nodeIds).filter(id => !connectedNodes.has(id));
    if (disconnected.length > 0 && workflow.nodes.length > 1) {
      result.validationWarnings.push(`Disconnected nodes: ${disconnected.join(', ')}`);
    }

    // Check for circular dependencies (using simple DFS)
    const hasCycle = this.detectCycles(workflow);
    if (hasCycle) {
      result.validationWarnings.push('Workflow contains cycles - may not terminate');
    }

    // Check for nodes with no outputs
    const terminalNodes = workflow.nodes.filter(node => {
      return !workflow.edges.some(e => e.source === node.id);
    });
    if (terminalNodes.length === 0 && workflow.nodes.length > 1) {
      result.validationWarnings.push('No terminal nodes found');
    }
  }

  /**
   * Find entry nodes (no incoming edges)
   */
  private findEntryNodes(workflow: WorkflowGraph): string[] {
    const nodesWithIncoming = new Set(workflow.edges.map(e => e.target));
    return workflow.nodes
      .filter(node => !nodesWithIncoming.has(node.id))
      .map(node => node.id);
  }

  /**
   * Detect cycles in workflow
   */
  private detectCycles(workflow: WorkflowGraph): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoing = workflow.edges.filter(e => e.source === nodeId);
      for (const edge of outgoing) {
        if (!visited.has(edge.target)) {
          if (dfs(edge.target)) return true;
        } else if (recursionStack.has(edge.target)) {
          return true; // Cycle detected
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of workflow.nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) return true;
      }
    }

    return false;
  }

  /**
   * Analyze execution graph
   */
  private analyzeExecutionGraph(workflow: WorkflowGraph, result: SimulationResult): void {
    // Find parallel blocks (nodes with same depth)
    const depths = this.calculateNodeDepths(workflow);
    const depthMap = new Map<number, string[]>();

    depths.forEach((depth, nodeId) => {
      if (!depthMap.has(depth)) {
        depthMap.set(depth, []);
      }
      depthMap.get(depth)!.push(nodeId);
    });

    result.parallelBlocks = Array.from(depthMap.values()).filter(block => block.length > 1);
    result.peakParallelism = Math.max(...result.parallelBlocks.map(b => b.length), 1);

    // Find critical path (longest path)
    result.criticalPath = this.findCriticalPath(workflow, depths);

    // Identify bottlenecks
    result.bottlenecks = this.identifyBottlenecks(workflow, depths);
  }

  /**
   * Calculate node depths (distance from entry)
   */
  private calculateNodeDepths(workflow: WorkflowGraph): Map<string, number> {
    const depths = new Map<string, number>();
    const entryNodes = this.findEntryNodes(workflow);

    // BFS to calculate depths
    const queue: Array<{ nodeId: string; depth: number }> = entryNodes.map(id => ({
      nodeId: id,
      depth: 0,
    }));

    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift()!;

      if (!depths.has(nodeId) || depths.get(nodeId)! < depth) {
        depths.set(nodeId, depth);
      }

      const outgoing = workflow.edges.filter(e => e.source === nodeId);
      outgoing.forEach(edge => {
        queue.push({ nodeId: edge.target, depth: depth + 1 });
      });
    }

    return depths;
  }

  /**
   * Find critical path (longest path through workflow)
   */
  private findCriticalPath(
    workflow: WorkflowGraph,
    depths: Map<string, number>
  ): string[] {
    const maxDepth = Math.max(...Array.from(depths.values()), 0);
    const path: string[] = [];

    let currentDepth = 0;
    let currentNodes = this.findEntryNodes(workflow);

    while (currentDepth <= maxDepth && currentNodes.length > 0) {
      // Pick first node at current depth
      const node = currentNodes[0];
      path.push(node);

      // Find next nodes
      const outgoing = workflow.edges.filter(e => e.source === node);
      currentNodes = outgoing
        .map(e => e.target)
        .filter(id => depths.get(id) === currentDepth + 1);

      currentDepth++;
    }

    return path;
  }

  /**
   * Identify bottlenecks
   */
  private identifyBottlenecks(
    workflow: WorkflowGraph,
    depths: Map<string, number>
  ): Array<{ nodeId: string; reason: string; impact: 'low' | 'medium' | 'high' }> {
    const bottlenecks: Array<{ nodeId: string; reason: string; impact: 'low' | 'medium' | 'high' }> = [];

    workflow.nodes.forEach(node => {
      const incoming = workflow.edges.filter(e => e.target === node.id);
      const outgoing = workflow.edges.filter(e => e.source === node.id);

      // Many inputs (synchronization point)
      if (incoming.length > 3) {
        bottlenecks.push({
          nodeId: node.id,
          reason: `Synchronization point: ${incoming.length} incoming dependencies`,
          impact: 'high',
        });
      }

      // Many outputs (fan-out)
      if (outgoing.length > 3) {
        bottlenecks.push({
          nodeId: node.id,
          reason: `Fan-out point: ${outgoing.length} outgoing branches`,
          impact: 'medium',
        });
      }
    });

    return bottlenecks;
  }

  /**
   * Calculate coverage
   */
  private calculateCoverage(workflow: WorkflowGraph, result: SimulationResult): void {
    const totalNodes = workflow.nodes.length;
    const coveredNodes = new Set(result.nodesCovered).size;

    result.nodesSkipped = workflow.nodes
      .map(n => n.id)
      .filter(id => !result.nodesCovered.includes(id));

    result.coveragePercentage = totalNodes > 0 ? (coveredNodes / totalNodes) * 100 : 0;
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(condition: string, state: WorkflowState): boolean {
    try {
      // Simple evaluation (in production, use safe evaluator)
      const func = new Function('state', `return ${condition}`);
      return !!func(state);
    } catch {
      return true; // Default to true on error
    }
  }

  /**
   * Generate mock outputs
   */
  private generateMockOutputs(node: WorkflowNode): Record<string, unknown> {
    return {
      result: `Mock output from ${node.data.label}`,
      status: 'success',
      timestamp: Date.now(),
    };
  }

  /**
   * Estimate execution time
   */
  private estimateExecutionTime(node: WorkflowNode): number {
    // Simple heuristic based on role
    const baseTimes: Record<string, number> = {
      orchestrator: 2000,
      architect: 5000,
      critic: 3000,
      'red-team': 4000,
      researcher: 6000,
      coder: 8000,
      tester: 5000,
      writer: 4000,
      worker: 3000,
      finalizer: 2000,
    };

    return baseTimes[node.data.role] || 3000;
  }

  /**
   * Estimate tokens
   */
  private estimateTokens(node: WorkflowNode): number {
    // Rough estimate: 1 token ≈ 4 characters
    const promptLength = node.data.promptTemplate?.length || 1000;
    return Math.ceil(promptLength / 4) + 500; // +500 for response
  }

  /**
   * Get simulation
   */
  getSimulation(simulationId: string): SimulationResult | null {
    return this.simulations.get(simulationId) || null;
  }

  /**
   * Add event listener
   */
  addEventListener(simulationId: string, listener: (event: SimulationEvent) => void): void {
    if (!this.eventListeners.has(simulationId)) {
      this.eventListeners.set(simulationId, []);
    }
    this.eventListeners.get(simulationId)!.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(simulationId: string, listener: (event: SimulationEvent) => void): void {
    const listeners = this.eventListeners.get(simulationId);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emitEvent(simulationId: string, event: SimulationEvent): void {
    const listeners = this.eventListeners.get(simulationId);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  }
}

/**
 * Singleton instance
 */
export const workflowSimulator = new WorkflowSimulator();
