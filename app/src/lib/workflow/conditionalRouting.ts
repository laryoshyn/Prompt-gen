/**
 * Conditional Routing & Looping System
 * Inspired by LangGraph cycles and CrewAI Flows (2024-2025)
 *
 * Features:
 * - Conditional edge routing based on workflow state
 * - Loop/cycle support with "repeat until" conditions
 * - State-based branching
 * - Max iteration limits to prevent infinite loops
 * - Condition evaluation engine
 * - Visual condition templates
 */

import type { WorkflowState } from '@/types/workflow';
import type { VersionedArtifact } from './artifactVersioning';

/**
 * Condition types for routing
 */
export type ConditionType =
  | 'always' // Always take this path
  | 'state-check' // Check workflow state value
  | 'artifact-exists' // Check if artifact exists
  | 'artifact-valid' // Check if artifact is valid
  | 'iteration-limit' // Check iteration count
  | 'custom-expression'; // Custom JavaScript expression

/**
 * Condition configuration
 */
export interface RoutingCondition {
  type: ConditionType;
  description?: string;

  // State check parameters
  stateKey?: string; // Key in workflowState.sharedState
  operator?: 'equals' | 'not-equals' | 'greater-than' | 'less-than' | 'contains' | 'exists';
  value?: unknown; // Expected value

  // Artifact parameters
  artifactPath?: string; // Path to artifact
  artifactSchema?: string; // Expected schema ID

  // Iteration parameters
  maxIterations?: number; // Maximum loop iterations
  currentIterationKey?: string; // State key for current iteration count

  // Custom expression
  expression?: string; // JavaScript expression (returns boolean)

  // Metadata
  label?: string; // Human-readable label for UI
  priority?: number; // Priority when multiple conditions match (higher wins)
}

/**
 * Loop configuration
 */
export interface LoopConfig {
  // Loop identification
  id: string; // Unique loop ID
  name: string; // Human-readable name

  // Loop nodes
  entryNodeId: string; // Node where loop starts
  exitNodeId: string; // Node where loop exits
  loopNodeIds: string[]; // Nodes within the loop

  // Loop condition
  repeatUntil: RoutingCondition; // Condition to exit loop
  maxIterations: number; // Safety limit
  currentIteration: number; // Current iteration count

  // State management
  iterationStateKey?: string; // Where to store iteration count
  loopStateKey?: string; // Where to store loop-specific state

  // Metadata
  description?: string;
}

/**
 * Condition evaluation result
 */
export interface ConditionResult {
  condition: RoutingCondition;
  satisfied: boolean;
  reason?: string; // Why condition was satisfied/unsatisfied
  evaluatedAt: number; // Timestamp
}

/**
 * Branching decision
 */
export interface BranchDecision {
  fromNodeId: string;
  toNodeId: string;
  condition: RoutingCondition;
  result: ConditionResult;
  timestamp: number;
}

/**
 * Loop execution state
 */
export interface LoopExecutionState {
  loopId: string;
  currentIteration: number;
  maxIterations: number;
  isActive: boolean;
  enteredAt: number;
  lastIterationAt?: number;
  iterationHistory: {
    iteration: number;
    timestamp: number;
    state: Record<string, unknown>;
  }[];
}

/**
 * Conditional Routing Manager
 */
export class ConditionalRoutingManager {
  private loops: Map<string, LoopConfig>;
  private loopExecutionState: Map<string, LoopExecutionState>;
  private branchingHistory: BranchDecision[];

  constructor() {
    this.loops = new Map();
    this.loopExecutionState = new Map();
    this.branchingHistory = [];
  }

  /**
   * Register a loop
   */
  registerLoop(config: LoopConfig): void {
    this.loops.set(config.id, config);

    // Initialize execution state
    this.loopExecutionState.set(config.id, {
      loopId: config.id,
      currentIteration: 0,
      maxIterations: config.maxIterations,
      isActive: false,
      enteredAt: 0,
      iterationHistory: [],
    });
  }

  /**
   * Evaluate a routing condition
   */
  evaluateCondition(
    condition: RoutingCondition,
    context: {
      workflowState: WorkflowState;
      artifacts: Map<string, VersionedArtifact>;
      currentNodeId: string;
    }
  ): ConditionResult {
    const timestamp = Date.now();

    switch (condition.type) {
      case 'always':
        return {
          condition,
          satisfied: true,
          reason: 'Always condition',
          evaluatedAt: timestamp,
        };

      case 'state-check':
        return this.evaluateStateCheck(condition, context.workflowState, timestamp);

      case 'artifact-exists':
        return this.evaluateArtifactExists(condition, context.artifacts, timestamp);

      case 'artifact-valid':
        return this.evaluateArtifactValid(condition, context.artifacts, timestamp);

      case 'iteration-limit':
        return this.evaluateIterationLimit(condition, context.workflowState, timestamp);

      case 'custom-expression':
        return this.evaluateCustomExpression(condition, context, timestamp);

      default:
        return {
          condition,
          satisfied: false,
          reason: `Unknown condition type: ${condition.type}`,
          evaluatedAt: timestamp,
        };
    }
  }

  /**
   * Select next node based on conditions (for branching)
   */
  selectNextNode(
    currentNodeId: string,
    possibleEdges: Array<{
      targetNodeId: string;
      condition?: RoutingCondition;
    }>,
    context: {
      workflowState: WorkflowState;
      artifacts: Map<string, VersionedArtifact>;
    }
  ): string | null {
    // Evaluate all conditions
    const evaluatedEdges = possibleEdges.map(edge => {
      const condition = edge.condition || { type: 'always' as const };
      const result = this.evaluateCondition(condition, {
        ...context,
        currentNodeId,
      });

      return { edge, result };
    });

    // Filter satisfied conditions
    const satisfiedEdges = evaluatedEdges.filter(e => e.result.satisfied);

    if (satisfiedEdges.length === 0) {
      return null; // No path available
    }

    // Sort by priority (higher first)
    satisfiedEdges.sort((a, b) => {
      const priorityA = a.edge.condition?.priority || 0;
      const priorityB = b.edge.condition?.priority || 0;
      return priorityB - priorityA;
    });

    // Take highest priority
    const selected = satisfiedEdges[0];

    // Record decision
    this.branchingHistory.push({
      fromNodeId: currentNodeId,
      toNodeId: selected.edge.targetNodeId,
      condition: selected.edge.condition || { type: 'always' },
      result: selected.result,
      timestamp: Date.now(),
    });

    return selected.edge.targetNodeId;
  }

  /**
   * Check if should continue loop
   */
  shouldContinueLoop(
    loopId: string,
    context: {
      workflowState: WorkflowState;
      artifacts: Map<string, VersionedArtifact>;
    }
  ): {
    continue: boolean;
    reason: string;
    currentIteration: number;
  } {
    const loopConfig = this.loops.get(loopId);
    const loopState = this.loopExecutionState.get(loopId);

    if (!loopConfig || !loopState) {
      return {
        continue: false,
        reason: 'Loop not found',
        currentIteration: 0,
      };
    }

    // Check max iterations
    if (loopState.currentIteration >= loopConfig.maxIterations) {
      return {
        continue: false,
        reason: `Max iterations reached (${loopConfig.maxIterations})`,
        currentIteration: loopState.currentIteration,
      };
    }

    // Evaluate repeat-until condition
    const conditionResult = this.evaluateCondition(loopConfig.repeatUntil, {
      ...context,
      currentNodeId: loopConfig.entryNodeId,
    });

    // If condition is satisfied, EXIT loop (repeat UNTIL condition is true)
    if (conditionResult.satisfied) {
      return {
        continue: false,
        reason: `Exit condition satisfied: ${conditionResult.reason}`,
        currentIteration: loopState.currentIteration,
      };
    }

    // Continue looping
    return {
      continue: true,
      reason: `Exit condition not yet satisfied (iteration ${loopState.currentIteration + 1})`,
      currentIteration: loopState.currentIteration,
    };
  }

  /**
   * Enter a loop
   */
  enterLoop(loopId: string, workflowState: WorkflowState): void {
    const loopState = this.loopExecutionState.get(loopId);
    if (!loopState) return;

    loopState.isActive = true;
    loopState.enteredAt = Date.now();
    loopState.currentIteration = 0;

    // Store iteration in workflow state if configured
    const loopConfig = this.loops.get(loopId);
    if (loopConfig?.iterationStateKey) {
      workflowState.sharedState[loopConfig.iterationStateKey] = 0;
    }
  }

  /**
   * Increment loop iteration
   */
  incrementLoopIteration(loopId: string, workflowState: WorkflowState): void {
    const loopState = this.loopExecutionState.get(loopId);
    const loopConfig = this.loops.get(loopId);

    if (!loopState || !loopConfig) return;

    loopState.currentIteration++;
    loopState.lastIterationAt = Date.now();

    // Record iteration history
    loopState.iterationHistory.push({
      iteration: loopState.currentIteration,
      timestamp: Date.now(),
      state: { ...workflowState.sharedState },
    });

    // Update workflow state if configured
    if (loopConfig.iterationStateKey) {
      workflowState.sharedState[loopConfig.iterationStateKey] = loopState.currentIteration;
    }
  }

  /**
   * Exit a loop
   */
  exitLoop(loopId: string, workflowState: WorkflowState): void {
    const loopState = this.loopExecutionState.get(loopId);
    if (!loopState) return;

    loopState.isActive = false;

    // Clean up state if needed
    const loopConfig = this.loops.get(loopId);
    if (loopConfig?.iterationStateKey) {
      delete workflowState.sharedState[loopConfig.iterationStateKey];
    }
  }

  /**
   * Get loop execution state
   */
  getLoopState(loopId: string): LoopExecutionState | null {
    return this.loopExecutionState.get(loopId) || null;
  }

  /**
   * Get branching history
   */
  getBranchingHistory(): BranchDecision[] {
    return this.branchingHistory;
  }

  /**
   * Evaluate state check condition
   */
  private evaluateStateCheck(
    condition: RoutingCondition,
    workflowState: WorkflowState,
    timestamp: number
  ): ConditionResult {
    if (!condition.stateKey) {
      return {
        condition,
        satisfied: false,
        reason: 'Missing stateKey',
        evaluatedAt: timestamp,
      };
    }

    const stateValue = workflowState.sharedState[condition.stateKey];
    const expectedValue = condition.value;
    const operator = condition.operator || 'equals';

    let satisfied = false;
    let reason = '';

    switch (operator) {
      case 'equals':
        satisfied = stateValue === expectedValue;
        reason = satisfied
          ? `${condition.stateKey} equals ${expectedValue}`
          : `${condition.stateKey} (${stateValue}) does not equal ${expectedValue}`;
        break;

      case 'not-equals':
        satisfied = stateValue !== expectedValue;
        reason = satisfied
          ? `${condition.stateKey} not equals ${expectedValue}`
          : `${condition.stateKey} equals ${expectedValue}`;
        break;

      case 'greater-than':
        satisfied = Number(stateValue) > Number(expectedValue);
        reason = satisfied
          ? `${condition.stateKey} (${stateValue}) > ${expectedValue}`
          : `${condition.stateKey} (${stateValue}) <= ${expectedValue}`;
        break;

      case 'less-than':
        satisfied = Number(stateValue) < Number(expectedValue);
        reason = satisfied
          ? `${condition.stateKey} (${stateValue}) < ${expectedValue}`
          : `${condition.stateKey} (${stateValue}) >= ${expectedValue}`;
        break;

      case 'contains':
        satisfied = String(stateValue).includes(String(expectedValue));
        reason = satisfied
          ? `${condition.stateKey} contains ${expectedValue}`
          : `${condition.stateKey} does not contain ${expectedValue}`;
        break;

      case 'exists':
        satisfied = stateValue !== undefined && stateValue !== null;
        reason = satisfied
          ? `${condition.stateKey} exists`
          : `${condition.stateKey} does not exist`;
        break;
    }

    return { condition, satisfied, reason, evaluatedAt: timestamp };
  }

  /**
   * Evaluate artifact exists condition
   */
  private evaluateArtifactExists(
    condition: RoutingCondition,
    artifacts: Map<string, VersionedArtifact>,
    timestamp: number
  ): ConditionResult {
    if (!condition.artifactPath) {
      return {
        condition,
        satisfied: false,
        reason: 'Missing artifactPath',
        evaluatedAt: timestamp,
      };
    }

    const exists = artifacts.has(condition.artifactPath);

    return {
      condition,
      satisfied: exists,
      reason: exists
        ? `Artifact ${condition.artifactPath} exists`
        : `Artifact ${condition.artifactPath} does not exist`,
      evaluatedAt: timestamp,
    };
  }

  /**
   * Evaluate artifact valid condition
   */
  private evaluateArtifactValid(
    condition: RoutingCondition,
    artifacts: Map<string, VersionedArtifact>,
    timestamp: number
  ): ConditionResult {
    if (!condition.artifactPath) {
      return {
        condition,
        satisfied: false,
        reason: 'Missing artifactPath',
        evaluatedAt: timestamp,
      };
    }

    const artifact = artifacts.get(condition.artifactPath);
    if (!artifact) {
      return {
        condition,
        satisfied: false,
        reason: `Artifact ${condition.artifactPath} not found`,
        evaluatedAt: timestamp,
      };
    }

    const isValid = artifact.validationStatus === 'valid';

    return {
      condition,
      satisfied: isValid,
      reason: isValid
        ? `Artifact ${condition.artifactPath} is valid`
        : `Artifact ${condition.artifactPath} is ${artifact.validationStatus || 'unknown'}`,
      evaluatedAt: timestamp,
    };
  }

  /**
   * Evaluate iteration limit condition
   */
  private evaluateIterationLimit(
    condition: RoutingCondition,
    workflowState: WorkflowState,
    timestamp: number
  ): ConditionResult {
    const currentIteration = condition.currentIterationKey
      ? (workflowState.sharedState[condition.currentIterationKey] as number) || 0
      : 0;

    const maxIterations = condition.maxIterations || 10;
    const satisfied = currentIteration < maxIterations;

    return {
      condition,
      satisfied,
      reason: satisfied
        ? `Iteration ${currentIteration} < ${maxIterations}`
        : `Max iterations reached (${maxIterations})`,
      evaluatedAt: timestamp,
    };
  }

  /**
   * Evaluate custom JavaScript expression
   */
  private evaluateCustomExpression(
    condition: RoutingCondition,
    context: {
      workflowState: WorkflowState;
      artifacts: Map<string, VersionedArtifact>;
      currentNodeId: string;
    },
    timestamp: number
  ): ConditionResult {
    if (!condition.expression) {
      return {
        condition,
        satisfied: false,
        reason: 'Missing expression',
        evaluatedAt: timestamp,
      };
    }

    try {
      // Create evaluation context
      const evalContext = {
        state: context.workflowState.sharedState,
        artifacts: Array.from(context.artifacts.values()),
        currentNode: context.currentNodeId,
      };

      // Evaluate expression (CAUTION: eval is dangerous in production)
      // In production, use a safe expression evaluator like expr-eval
      const func = new Function('context', `
        with (context) {
          return ${condition.expression};
        }
      `);

      const result = func(evalContext);
      const satisfied = Boolean(result);

      return {
        condition,
        satisfied,
        reason: satisfied
          ? `Expression evaluated to ${result}`
          : `Expression evaluated to ${result}`,
        evaluatedAt: timestamp,
      };
    } catch (error) {
      return {
        condition,
        satisfied: false,
        reason: `Expression error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        evaluatedAt: timestamp,
      };
    }
  }
}

/**
 * Singleton instance
 */
export const conditionalRoutingManager = new ConditionalRoutingManager();

/**
 * Condition templates for common scenarios
 */
export const CONDITION_TEMPLATES: Record<string, RoutingCondition> = {
  ALWAYS: {
    type: 'always',
    label: 'Always',
    description: 'Always take this path',
  },

  ARTIFACT_CREATED: {
    type: 'artifact-exists',
    label: 'Artifact Exists',
    description: 'Route if artifact has been created',
    artifactPath: 'output.json', // Placeholder
  },

  ARTIFACT_VALID: {
    type: 'artifact-valid',
    label: 'Artifact Valid',
    description: 'Route if artifact passed validation',
    artifactPath: 'output.json', // Placeholder
  },

  ITERATION_LIMIT: {
    type: 'iteration-limit',
    label: 'Under Iteration Limit',
    description: 'Continue if iterations below limit',
    maxIterations: 10,
    currentIterationKey: 'iteration',
  },

  APPROVAL_GRANTED: {
    type: 'state-check',
    label: 'Approval Granted',
    description: 'Route if approval state is true',
    stateKey: 'approved',
    operator: 'equals',
    value: true,
  },

  ERROR_OCCURRED: {
    type: 'state-check',
    label: 'Error Occurred',
    description: 'Route if error flag is set',
    stateKey: 'error',
    operator: 'exists',
  },

  QUALITY_THRESHOLD: {
    type: 'state-check',
    label: 'Quality Above Threshold',
    description: 'Route if quality score exceeds threshold',
    stateKey: 'quality_score',
    operator: 'greater-than',
    value: 0.8,
  },
};
