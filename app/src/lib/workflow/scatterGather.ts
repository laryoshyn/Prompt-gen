/**
 * Scatter-Gather Orchestration Pattern
 * Distribute work to multiple agents in parallel, then aggregate results
 *
 * Pattern: Scatter → Execute in Parallel → Gather → Aggregate
 *
 * Based on enterprise integration patterns (2024-2025)
 */

import type { WorkflowState } from '@/types/workflow';
import type { VersionedArtifact } from './artifactVersioning';

/**
 * Scatter strategy - how to distribute work
 */
export type ScatterStrategy =
  | 'broadcast' // Send same task to all agents
  | 'split-by-type' // Route different types to different agents
  | 'round-robin' // Distribute evenly across agents
  | 'load-balanced' // Distribute based on agent availability
  | 'custom'; // Custom distribution logic

/**
 * Gather strategy - how to collect results
 */
export type GatherStrategy =
  | 'wait-all' // Wait for all agents to complete
  | 'wait-first' // Return first result
  | 'wait-majority' // Wait for majority (>50%)
  | 'timeout'; // Wait until timeout, use whatever completed

/**
 * Aggregation strategy - how to combine results
 */
export type AggregationStrategy =
  | 'merge' // Merge all results into single object
  | 'concatenate' // Concatenate results (arrays/strings)
  | 'vote' // Majority vote on result
  | 'best-of' // Pick best result based on criteria
  | 'consensus' // Require agreement among results
  | 'custom'; // Custom aggregation logic

/**
 * Scatter-Gather configuration
 */
export interface ScatterGatherConfig {
  id: string;
  name: string;
  description?: string;

  // Distribution
  scatterStrategy: ScatterStrategy;
  targetAgents: string[]; // Agent node IDs

  // Custom scatter logic
  scatterFunction?: (input: unknown, agents: string[]) => Map<string, unknown>; // agentId -> task

  // Execution
  gatherStrategy: GatherStrategy;
  timeout?: number; // milliseconds
  minResults?: number; // Minimum results needed

  // Aggregation
  aggregationStrategy: AggregationStrategy;
  aggregationFunction?: (results: Map<string, unknown>) => unknown;

  // Quality criteria for 'best-of'
  qualityCriteria?: {
    metric: string; // e.g., 'length', 'score', 'confidence'
    direction: 'maximize' | 'minimize';
  };

  // Error handling
  failureMode: 'fail-fast' | 'partial-results' | 'require-all';
  maxRetries?: number;
}

/**
 * Scatter task
 */
export interface ScatterTask {
  id: string;
  configId: string;
  input: unknown;
  scatteredAt: number;

  // Distribution results
  distribution: Map<string, unknown>; // agentId -> task input
}

/**
 * Agent execution result
 */
export interface AgentExecutionResult {
  agentId: string;
  taskId: string;
  status: 'completed' | 'failed' | 'timeout';
  output?: unknown;
  error?: string;
  startTime: number;
  endTime: number;
  executionTime: number;
}

/**
 * Gather result
 */
export interface GatherResult {
  taskId: string;
  configId: string;
  strategy: GatherStrategy;

  // Results
  totalAgents: number;
  completedAgents: number;
  failedAgents: number;
  timedOutAgents: number;

  results: AgentExecutionResult[];

  // Timing
  startTime: number;
  endTime: number;
  totalTime: number;
}

/**
 * Aggregated result
 */
export interface AggregatedResult {
  taskId: string;
  configId: string;
  strategy: AggregationStrategy;

  // Final output
  output: unknown;

  // Metadata
  sourceResults: number; // Number of results aggregated
  confidence?: number; // 0-1, for voting/consensus
  agreement?: number; // 0-1, how much results agreed

  // Timing
  aggregatedAt: number;
}

/**
 * Scatter-Gather Manager
 */
export class ScatterGatherManager {
  private configs: Map<string, ScatterGatherConfig>;
  private activeTasks: Map<string, ScatterTask>;
  private results: Map<string, GatherResult>;
  private aggregated: Map<string, AggregatedResult>;

  constructor() {
    this.configs = new Map();
    this.activeTasks = new Map();
    this.results = new Map();
    this.aggregated = new Map();
  }

  /**
   * Register scatter-gather configuration
   */
  registerConfig(config: Omit<ScatterGatherConfig, 'id'>): ScatterGatherConfig {
    const scatterConfig: ScatterGatherConfig = {
      ...config,
      id: `sg-${Date.now()}`,
    };

    this.configs.set(scatterConfig.id, scatterConfig);
    return scatterConfig;
  }

  /**
   * Scatter work to agents
   */
  scatter(configId: string, input: unknown): ScatterTask {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error(`Scatter-gather config not found: ${configId}`);
    }

    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Distribute work based on strategy
    const distribution = this.distributeWork(config, input);

    const task: ScatterTask = {
      id: taskId,
      configId,
      input,
      scatteredAt: Date.now(),
      distribution,
    };

    this.activeTasks.set(taskId, task);
    return task;
  }

  /**
   * Distribute work based on scatter strategy
   */
  private distributeWork(
    config: ScatterGatherConfig,
    input: unknown
  ): Map<string, unknown> {
    const distribution = new Map<string, unknown>();

    switch (config.scatterStrategy) {
      case 'broadcast':
        // Send same input to all agents
        config.targetAgents.forEach(agentId => {
          distribution.set(agentId, input);
        });
        break;

      case 'split-by-type':
        // Assume input is array of items with 'type' field
        if (Array.isArray(input)) {
          const typeGroups = new Map<string, unknown[]>();
          input.forEach(item => {
            const type = (item as any).type || 'default';
            if (!typeGroups.has(type)) {
              typeGroups.set(type, []);
            }
            typeGroups.get(type)!.push(item);
          });

          // Assign type groups to agents (simple round-robin)
          const types = Array.from(typeGroups.keys());
          types.forEach((type, index) => {
            const agentId = config.targetAgents[index % config.targetAgents.length];
            distribution.set(agentId, typeGroups.get(type));
          });
        }
        break;

      case 'round-robin':
        // Assume input is array
        if (Array.isArray(input)) {
          const agentInputs = new Map<string, unknown[]>();
          config.targetAgents.forEach(id => agentInputs.set(id, []));

          input.forEach((item, index) => {
            const agentId = config.targetAgents[index % config.targetAgents.length];
            agentInputs.get(agentId)!.push(item);
          });

          agentInputs.forEach((items, agentId) => {
            if (items.length > 0) {
              distribution.set(agentId, items);
            }
          });
        }
        break;

      case 'load-balanced':
        // Simple load balancing (in production, consider agent load)
        if (Array.isArray(input)) {
          const itemsPerAgent = Math.ceil(input.length / config.targetAgents.length);
          config.targetAgents.forEach((agentId, index) => {
            const start = index * itemsPerAgent;
            const end = Math.min(start + itemsPerAgent, input.length);
            if (start < input.length) {
              distribution.set(agentId, input.slice(start, end));
            }
          });
        }
        break;

      case 'custom':
        // Use custom function
        if (config.scatterFunction) {
          return config.scatterFunction(input, config.targetAgents);
        }
        break;
    }

    return distribution;
  }

  /**
   * Gather results from agents
   */
  async gather(
    taskId: string,
    executor: (agentId: string, task: unknown) => Promise<{
      output: unknown;
      error?: string;
    }>
  ): Promise<GatherResult> {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const config = this.configs.get(task.configId);
    if (!config) {
      throw new Error(`Config not found: ${task.configId}`);
    }

    const startTime = Date.now();
    const results: AgentExecutionResult[] = [];

    // Execute based on gather strategy
    switch (config.gatherStrategy) {
      case 'wait-all':
        results.push(...await this.executeAll(task, executor, config.timeout));
        break;

      case 'wait-first':
        results.push(...await this.executeUntilFirst(task, executor, config.timeout));
        break;

      case 'wait-majority':
        results.push(...await this.executeUntilMajority(task, executor, config.timeout));
        break;

      case 'timeout':
        results.push(...await this.executeWithTimeout(task, executor, config.timeout || 30000));
        break;
    }

    const endTime = Date.now();

    const gatherResult: GatherResult = {
      taskId,
      configId: task.configId,
      strategy: config.gatherStrategy,
      totalAgents: task.distribution.size,
      completedAgents: results.filter(r => r.status === 'completed').length,
      failedAgents: results.filter(r => r.status === 'failed').length,
      timedOutAgents: results.filter(r => r.status === 'timeout').length,
      results,
      startTime,
      endTime,
      totalTime: endTime - startTime,
    };

    this.results.set(taskId, gatherResult);
    return gatherResult;
  }

  /**
   * Execute all agents (wait for all to complete)
   */
  private async executeAll(
    task: ScatterTask,
    executor: (agentId: string, task: unknown) => Promise<{ output: unknown; error?: string }>,
    timeout?: number
  ): Promise<AgentExecutionResult[]> {
    const promises = Array.from(task.distribution.entries()).map(async ([agentId, agentTask]) => {
      const startTime = Date.now();
      try {
        const timeoutPromise = timeout
          ? new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), timeout)
            )
          : null;

        const executionPromise = executor(agentId, agentTask);

        const result = timeoutPromise
          ? await Promise.race([executionPromise, timeoutPromise])
          : await executionPromise;

        const endTime = Date.now();

        return {
          agentId,
          taskId: task.id,
          status: 'completed' as const,
          output: result.output,
          error: result.error,
          startTime,
          endTime,
          executionTime: endTime - startTime,
        };
      } catch (error) {
        const endTime = Date.now();
        return {
          agentId,
          taskId: task.id,
          status: error instanceof Error && error.message === 'Timeout' ? 'timeout' as const : 'failed' as const,
          error: error instanceof Error ? error.message : 'Unknown error',
          startTime,
          endTime,
          executionTime: endTime - startTime,
        };
      }
    });

    return Promise.all(promises);
  }

  /**
   * Execute until first completion
   */
  private async executeUntilFirst(
    task: ScatterTask,
    executor: (agentId: string, task: unknown) => Promise<{ output: unknown; error?: string }>,
    timeout?: number
  ): Promise<AgentExecutionResult[]> {
    const entries = Array.from(task.distribution.entries());
    const promises = entries.map(async ([agentId, agentTask]) => {
      const startTime = Date.now();
      try {
        const result = await executor(agentId, agentTask);
        const endTime = Date.now();

        return {
          agentId,
          taskId: task.id,
          status: 'completed' as const,
          output: result.output,
          startTime,
          endTime,
          executionTime: endTime - startTime,
        };
      } catch (error) {
        const endTime = Date.now();
        return {
          agentId,
          taskId: task.id,
          status: 'failed' as const,
          error: error instanceof Error ? error.message : 'Unknown error',
          startTime,
          endTime,
          executionTime: endTime - startTime,
        };
      }
    });

    // Return first successful result
    const first = await Promise.race(promises);
    return [first];
  }

  /**
   * Execute until majority completes
   */
  private async executeUntilMajority(
    task: ScatterTask,
    executor: (agentId: string, task: unknown) => Promise<{ output: unknown; error?: string }>,
    timeout?: number
  ): Promise<AgentExecutionResult[]> {
    const majority = Math.ceil(task.distribution.size / 2);
    const results: AgentExecutionResult[] = [];

    const entries = Array.from(task.distribution.entries());
    for (const [agentId, agentTask] of entries) {
      const startTime = Date.now();
      try {
        const result = await executor(agentId, agentTask);
        const endTime = Date.now();

        results.push({
          agentId,
          taskId: task.id,
          status: 'completed',
          output: result.output,
          startTime,
          endTime,
          executionTime: endTime - startTime,
        });

        if (results.filter(r => r.status === 'completed').length >= majority) {
          break;
        }
      } catch (error) {
        const endTime = Date.now();
        results.push({
          agentId,
          taskId: task.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          startTime,
          endTime,
          executionTime: endTime - startTime,
        });
      }
    }

    return results;
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout(
    task: ScatterTask,
    executor: (agentId: string, task: unknown) => Promise<{ output: unknown; error?: string }>,
    timeout: number
  ): Promise<AgentExecutionResult[]> {
    const results: AgentExecutionResult[] = [];
    const deadline = Date.now() + timeout;

    const entries = Array.from(task.distribution.entries());
    for (const [agentId, agentTask] of entries) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;

      const startTime = Date.now();
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), remaining)
        );

        const result = await Promise.race([executor(agentId, agentTask), timeoutPromise]);
        const endTime = Date.now();

        results.push({
          agentId,
          taskId: task.id,
          status: 'completed',
          output: result.output,
          startTime,
          endTime,
          executionTime: endTime - startTime,
        });
      } catch (error) {
        const endTime = Date.now();
        results.push({
          agentId,
          taskId: task.id,
          status: 'timeout',
          error: error instanceof Error ? error.message : 'Unknown error',
          startTime,
          endTime,
          executionTime: endTime - startTime,
        });
      }
    }

    return results;
  }

  /**
   * Aggregate gathered results
   */
  aggregate(taskId: string): AggregatedResult {
    const gatherResult = this.results.get(taskId);
    if (!gatherResult) {
      throw new Error(`Gather result not found: ${taskId}`);
    }

    const config = this.configs.get(gatherResult.configId);
    if (!config) {
      throw new Error(`Config not found: ${gatherResult.configId}`);
    }

    const completedResults = gatherResult.results.filter(r => r.status === 'completed');

    let output: unknown;
    let confidence: number | undefined;
    let agreement: number | undefined;

    switch (config.aggregationStrategy) {
      case 'merge':
        output = this.aggregateMerge(completedResults);
        break;

      case 'concatenate':
        output = this.aggregateConcatenate(completedResults);
        break;

      case 'vote':
        const voteResult = this.aggregateVote(completedResults);
        output = voteResult.winner;
        confidence = voteResult.confidence;
        break;

      case 'best-of':
        output = this.aggregateBestOf(completedResults, config.qualityCriteria);
        break;

      case 'consensus':
        const consensusResult = this.aggregateConsensus(completedResults);
        output = consensusResult.output;
        agreement = consensusResult.agreement;
        break;

      case 'custom':
        if (config.aggregationFunction) {
          const resultsMap = new Map(completedResults.map(r => [r.agentId, r.output]));
          output = config.aggregationFunction(resultsMap);
        } else {
          output = completedResults.map(r => r.output);
        }
        break;

      default:
        output = completedResults.map(r => r.output);
    }

    const aggregatedResult: AggregatedResult = {
      taskId,
      configId: gatherResult.configId,
      strategy: config.aggregationStrategy,
      output,
      sourceResults: completedResults.length,
      confidence,
      agreement,
      aggregatedAt: Date.now(),
    };

    this.aggregated.set(taskId, aggregatedResult);
    return aggregatedResult;
  }

  /**
   * Merge aggregation - combine objects
   */
  private aggregateMerge(results: AgentExecutionResult[]): unknown {
    return results.reduce((acc, result) => {
      if (typeof result.output === 'object' && result.output !== null) {
        return { ...acc, ...result.output };
      }
      return acc;
    }, {});
  }

  /**
   * Concatenate aggregation - join arrays/strings
   */
  private aggregateConcatenate(results: AgentExecutionResult[]): unknown {
    const first = results[0]?.output;

    if (Array.isArray(first)) {
      return results.flatMap(r => Array.isArray(r.output) ? r.output : []);
    }

    if (typeof first === 'string') {
      return results.map(r => String(r.output)).join('\n\n');
    }

    return results.map(r => r.output);
  }

  /**
   * Vote aggregation - majority vote
   */
  private aggregateVote(results: AgentExecutionResult[]): {
    winner: unknown;
    confidence: number;
  } {
    const votes = new Map<string, { value: unknown; count: number }>();

    results.forEach(result => {
      const key = JSON.stringify(result.output);
      if (votes.has(key)) {
        votes.get(key)!.count++;
      } else {
        votes.set(key, { value: result.output, count: 1 });
      }
    });

    let winner: unknown = null;
    let maxVotes = 0;

    votes.forEach(({ value, count }) => {
      if (count > maxVotes) {
        maxVotes = count;
        winner = value;
      }
    });

    const confidence = maxVotes / results.length;

    return { winner, confidence };
  }

  /**
   * Best-of aggregation - pick best based on criteria
   */
  private aggregateBestOf(
    results: AgentExecutionResult[],
    criteria?: ScatterGatherConfig['qualityCriteria']
  ): unknown {
    if (!criteria || results.length === 0) {
      return results[0]?.output;
    }

    let best = results[0];

    for (const result of results) {
      const currentValue = this.extractMetric(result.output, criteria.metric);
      const bestValue = this.extractMetric(best.output, criteria.metric);

      if (criteria.direction === 'maximize' && currentValue > bestValue) {
        best = result;
      } else if (criteria.direction === 'minimize' && currentValue < bestValue) {
        best = result;
      }
    }

    return best.output;
  }

  /**
   * Consensus aggregation - require agreement
   */
  private aggregateConsensus(results: AgentExecutionResult[]): {
    output: unknown;
    agreement: number;
  } {
    if (results.length === 0) {
      return { output: null, agreement: 0 };
    }

    const { winner, confidence } = this.aggregateVote(results);
    return { output: winner, agreement: confidence };
  }

  /**
   * Extract metric from output
   */
  private extractMetric(output: unknown, metric: string): number {
    if (typeof output === 'object' && output !== null && metric in output) {
      return Number((output as any)[metric]) || 0;
    }

    if (metric === 'length') {
      if (typeof output === 'string') return output.length;
      if (Array.isArray(output)) return output.length;
    }

    return 0;
  }

  /**
   * Get configuration
   */
  getConfig(configId: string): ScatterGatherConfig | null {
    return this.configs.get(configId) || null;
  }

  /**
   * Get gather result
   */
  getGatherResult(taskId: string): GatherResult | null {
    return this.results.get(taskId) || null;
  }

  /**
   * Get aggregated result
   */
  getAggregatedResult(taskId: string): AggregatedResult | null {
    return this.aggregated.get(taskId) || null;
  }
}

/**
 * Singleton instance
 */
export const scatterGatherManager = new ScatterGatherManager();
