/**
 * Real-Time Workflow Execution Monitoring
 *
 * Live monitoring and debugging of workflow execution with metrics,
 * progress tracking, and performance analysis.
 *
 * Features:
 * - Real-time execution tracking
 * - Live progress updates
 * - Performance metrics (timing, tokens, cost)
 * - Agent status monitoring
 * - Log streaming with levels
 * - Error tracking and debugging
 * - Execution timeline visualization
 * - Resource usage monitoring
 * - Historical execution data
 * - Breakpoint support
 */

import type { WorkflowNode } from '@/types/workflow';

// ============================================================================
// Types
// ============================================================================

export type ExecutionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Workflow execution session
 */
export interface ExecutionSession {
  id: string;
  workflowId: string;
  workflowName: string;
  status: ExecutionStatus;

  // Timing
  startedAt: string;
  completedAt?: string;
  pausedAt?: string;
  duration?: number; // Milliseconds

  // Progress
  totalAgents: number;
  completedAgents: number;
  failedAgents: number;
  currentAgent?: string;

  // Metrics
  metrics: ExecutionMetrics;

  // Agents
  agents: Map<string, AgentExecutionState>;

  // Logs
  logs: ExecutionLog[];

  // Errors
  errors: ExecutionError[];

  // Timeline
  timeline: TimelineEvent[];

  // Config
  config: ExecutionConfig;
}

/**
 * Agent execution state
 */
export interface AgentExecutionState {
  agentId: string;
  agentLabel: string;
  agentRole: string;
  status: AgentStatus;

  // Timing
  startedAt?: string;
  completedAt?: string;
  duration?: number;

  // Metrics
  metrics: {
    tokensUsed: number;
    cost: number;
    thinkingTime?: number;
    executionTime?: number;
  };

  // Output
  output?: unknown;
  artifacts: string[]; // Artifact IDs produced

  // Error
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };

  // Retries
  retryCount: number;
  maxRetries: number;
}

/**
 * Execution metrics
 */
export interface ExecutionMetrics {
  // Timing
  totalDuration: number;
  avgAgentDuration: number;
  maxAgentDuration: number;
  minAgentDuration: number;

  // Tokens
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;

  // Cost
  totalCost: number;
  costPerAgent: number;

  // Performance
  throughput: number; // Agents per second
  parallelismFactor: number; // Actual parallel / potential parallel

  // Resources
  memoryUsage?: number; // MB
  cpuUsage?: number; // Percentage
}

/**
 * Execution log entry
 */
export interface ExecutionLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string; // Agent ID or 'system'
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Execution error
 */
export interface ExecutionError {
  id: string;
  timestamp: string;
  agentId?: string;
  type: string;
  message: string;
  stack?: string;
  fatal: boolean;
  context?: Record<string, any>;
}

/**
 * Timeline event
 */
export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'start' | 'agent-start' | 'agent-complete' | 'agent-fail' | 'pause' | 'resume' | 'complete' | 'fail';
  agentId?: string;
  description: string;
  metadata?: Record<string, any>;
}

/**
 * Execution configuration
 */
export interface ExecutionConfig {
  // Monitoring
  enableLogs: boolean;
  logLevel: LogLevel;
  enableMetrics: boolean;
  enableTimeline: boolean;

  // Performance
  enableProfiling: boolean;
  sampleInterval: number; // Milliseconds

  // Debugging
  breakpoints: string[]; // Agent IDs
  pauseOnError: boolean;
  captureState: boolean;

  // Limits
  maxLogEntries: number;
  maxTimelineEvents: number;
}

/**
 * Live execution update
 */
export interface ExecutionUpdate {
  sessionId: string;
  timestamp: string;
  type: 'status' | 'progress' | 'log' | 'error' | 'metrics' | 'agent-status';
  data: any;
}

// ============================================================================
// Execution Monitor
// ============================================================================

export class ExecutionMonitor {
  private sessions: Map<string, ExecutionSession> = new Map();
  private activeSessionId: string | null = null;
  private updateCallbacks: Map<string, (update: ExecutionUpdate) => void> = new Map();

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Start new execution session
   */
  startSession(params: {
    workflowId: string;
    workflowName: string;
    agents: WorkflowNode[];
    config?: Partial<ExecutionConfig>;
  }): ExecutionSession {
    const defaultConfig: ExecutionConfig = {
      enableLogs: true,
      logLevel: 'info',
      enableMetrics: true,
      enableTimeline: true,
      enableProfiling: false,
      sampleInterval: 1000,
      breakpoints: [],
      pauseOnError: false,
      captureState: true,
      maxLogEntries: 1000,
      maxTimelineEvents: 500,
    };

    const session: ExecutionSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workflowId: params.workflowId,
      workflowName: params.workflowName,
      status: 'running',
      startedAt: new Date().toISOString(),
      totalAgents: params.agents.length,
      completedAgents: 0,
      failedAgents: 0,
      metrics: this.initializeMetrics(),
      agents: new Map(),
      logs: [],
      errors: [],
      timeline: [],
      config: { ...defaultConfig, ...params.config },
    };

    // Initialize agent states
    for (const agent of params.agents) {
      session.agents.set(agent.id, {
        agentId: agent.id,
        agentLabel: agent.data.label,
        agentRole: agent.data.role,
        status: 'pending',
        metrics: {
          tokensUsed: 0,
          cost: 0,
        },
        artifacts: [],
        retryCount: 0,
        maxRetries: agent.data.config.retries || 3,
      });
    }

    // Add start event
    this.addTimelineEvent(session, {
      type: 'start',
      description: `Started workflow "${params.workflowName}"`,
    });

    this.addLog(session, {
      level: 'info',
      source: 'system',
      message: `Execution session started: ${session.id}`,
    });

    this.sessions.set(session.id, session);
    this.activeSessionId = session.id;

    this.notifyUpdate(session.id, {
      type: 'status',
      data: { status: 'running' },
    });

    return session;
  }

  /**
   * Get active session
   */
  getActiveSession(): ExecutionSession | null {
    if (!this.activeSessionId) return null;
    return this.sessions.get(this.activeSessionId) || null;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): ExecutionSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * List all sessions
   */
  listSessions(): ExecutionSession[] {
    return Array.from(this.sessions.values());
  }

  // ============================================================================
  // Agent Tracking
  // ============================================================================

  /**
   * Start agent execution
   */
  startAgent(sessionId: string, agentId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const agent = session.agents.get(agentId);
    if (!agent) return;

    agent.status = 'running';
    agent.startedAt = new Date().toISOString();
    session.currentAgent = agentId;

    this.addTimelineEvent(session, {
      type: 'agent-start',
      agentId,
      description: `Started ${agent.agentLabel} (${agent.agentRole})`,
    });

    this.addLog(session, {
      level: 'info',
      source: agentId,
      message: `Agent ${agent.agentLabel} started`,
    });

    this.notifyUpdate(sessionId, {
      type: 'agent-status',
      data: { agentId, status: 'running' },
    });

    // Check for breakpoint
    if (session.config.breakpoints.includes(agentId)) {
      this.pauseSession(sessionId, `Breakpoint at ${agent.agentLabel}`);
    }
  }

  /**
   * Complete agent execution
   */
  completeAgent(sessionId: string, agentId: string, output: {
    result?: unknown;
    artifacts?: string[];
    metrics?: {
      tokensUsed?: number;
      cost?: number;
      thinkingTime?: number;
    };
  }): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const agent = session.agents.get(agentId);
    if (!agent) return;

    agent.status = 'completed';
    agent.completedAt = new Date().toISOString();
    agent.output = output.result;
    agent.artifacts = output.artifacts || [];

    if (agent.startedAt) {
      agent.duration = new Date().getTime() - new Date(agent.startedAt).getTime();
    }

    if (output.metrics) {
      agent.metrics.tokensUsed = output.metrics.tokensUsed || 0;
      agent.metrics.cost = output.metrics.cost || 0;
      agent.metrics.thinkingTime = output.metrics.thinkingTime;
    }

    session.completedAgents++;
    session.currentAgent = undefined;

    this.addTimelineEvent(session, {
      type: 'agent-complete',
      agentId,
      description: `Completed ${agent.agentLabel} (${agent.duration}ms)`,
      metadata: { duration: agent.duration, tokens: agent.metrics.tokensUsed },
    });

    this.addLog(session, {
      level: 'info',
      source: agentId,
      message: `Agent ${agent.agentLabel} completed (${agent.duration}ms, ${agent.metrics.tokensUsed} tokens)`,
    });

    this.updateMetrics(session);
    this.notifyUpdate(sessionId, {
      type: 'progress',
      data: { completed: session.completedAgents, total: session.totalAgents },
    });

    // Check if workflow complete
    if (session.completedAgents + session.failedAgents >= session.totalAgents) {
      this.completeSession(sessionId);
    }
  }

  /**
   * Fail agent execution
   */
  failAgent(sessionId: string, agentId: string, error: {
    message: string;
    stack?: string;
    code?: string;
  }): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const agent = session.agents.get(agentId);
    if (!agent) return;

    agent.status = 'failed';
    agent.completedAt = new Date().toISOString();
    agent.error = error;

    if (agent.startedAt) {
      agent.duration = new Date().getTime() - new Date(agent.startedAt).getTime();
    }

    session.failedAgents++;
    session.currentAgent = undefined;

    const executionError: ExecutionError = {
      id: `error-${Date.now()}`,
      timestamp: new Date().toISOString(),
      agentId,
      type: error.code || 'AgentExecutionError',
      message: error.message,
      stack: error.stack,
      fatal: false,
    };

    session.errors.push(executionError);

    this.addTimelineEvent(session, {
      type: 'agent-fail',
      agentId,
      description: `Failed ${agent.agentLabel}: ${error.message}`,
      metadata: { error: error.message },
    });

    this.addLog(session, {
      level: 'error',
      source: agentId,
      message: `Agent ${agent.agentLabel} failed: ${error.message}`,
      metadata: { error },
    });

    this.notifyUpdate(sessionId, {
      type: 'error',
      data: executionError,
    });

    // Pause on error if configured
    if (session.config.pauseOnError) {
      this.pauseSession(sessionId, `Error in ${agent.agentLabel}`);
    }
  }

  // ============================================================================
  // Session Control
  // ============================================================================

  /**
   * Pause session
   */
  pauseSession(sessionId: string, reason?: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'paused';
    session.pausedAt = new Date().toISOString();

    this.addTimelineEvent(session, {
      type: 'pause',
      description: reason || 'Execution paused',
    });

    this.addLog(session, {
      level: 'info',
      source: 'system',
      message: `Execution paused: ${reason || 'Manual pause'}`,
    });

    this.notifyUpdate(sessionId, {
      type: 'status',
      data: { status: 'paused', reason },
    });
  }

  /**
   * Resume session
   */
  resumeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'running';
    session.pausedAt = undefined;

    this.addTimelineEvent(session, {
      type: 'resume',
      description: 'Execution resumed',
    });

    this.addLog(session, {
      level: 'info',
      source: 'system',
      message: 'Execution resumed',
    });

    this.notifyUpdate(sessionId, {
      type: 'status',
      data: { status: 'running' },
    });
  }

  /**
   * Complete session
   */
  completeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = session.failedAgents > 0 ? 'failed' : 'completed';
    session.completedAt = new Date().toISOString();
    session.duration = new Date().getTime() - new Date(session.startedAt).getTime();

    this.updateMetrics(session);

    this.addTimelineEvent(session, {
      type: session.status === 'completed' ? 'complete' : 'fail',
      description: `Workflow ${session.status} (${session.duration}ms)`,
      metadata: {
        duration: session.duration,
        completed: session.completedAgents,
        failed: session.failedAgents,
      },
    });

    this.addLog(session, {
      level: session.status === 'completed' ? 'info' : 'error',
      source: 'system',
      message: `Execution ${session.status}: ${session.completedAgents} completed, ${session.failedAgents} failed`,
    });

    this.notifyUpdate(sessionId, {
      type: 'status',
      data: { status: session.status, duration: session.duration },
    });

    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
    }
  }

  /**
   * Cancel session
   */
  cancelSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'cancelled';
    session.completedAt = new Date().toISOString();
    session.duration = new Date().getTime() - new Date(session.startedAt).getTime();

    this.addTimelineEvent(session, {
      type: 'fail',
      description: 'Execution cancelled by user',
    });

    this.addLog(session, {
      level: 'warn',
      source: 'system',
      message: 'Execution cancelled',
    });

    this.notifyUpdate(sessionId, {
      type: 'status',
      data: { status: 'cancelled' },
    });

    if (this.activeSessionId === sessionId) {
      this.activeSessionId = null;
    }
  }

  // ============================================================================
  // Logging
  // ============================================================================

  /**
   * Add log entry
   */
  addLog(session: ExecutionSession, log: Omit<ExecutionLog, 'id' | 'timestamp'>): void {
    if (!session.config.enableLogs) return;

    // Check log level
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const minLevelIdx = levels.indexOf(session.config.logLevel);
    const logLevelIdx = levels.indexOf(log.level);

    if (logLevelIdx < minLevelIdx) return;

    const entry: ExecutionLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...log,
    };

    session.logs.push(entry);

    // Trim logs if exceeds max
    if (session.logs.length > session.config.maxLogEntries) {
      session.logs.shift();
    }

    this.notifyUpdate(session.id, {
      type: 'log',
      data: entry,
    });
  }

  /**
   * Get logs
   */
  getLogs(sessionId: string, filter?: {
    level?: LogLevel;
    source?: string;
    limit?: number;
  }): ExecutionLog[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    let logs = [...session.logs];

    if (filter?.level) {
      logs = logs.filter(log => log.level === filter.level);
    }

    if (filter?.source) {
      logs = logs.filter(log => log.source === filter.source);
    }

    if (filter?.limit) {
      logs = logs.slice(-filter.limit);
    }

    return logs;
  }

  // ============================================================================
  // Metrics
  // ============================================================================

  /**
   * Initialize metrics
   */
  private initializeMetrics(): ExecutionMetrics {
    return {
      totalDuration: 0,
      avgAgentDuration: 0,
      maxAgentDuration: 0,
      minAgentDuration: Infinity,
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      thinkingTokens: 0,
      totalCost: 0,
      costPerAgent: 0,
      throughput: 0,
      parallelismFactor: 0,
    };
  }

  /**
   * Update metrics
   */
  private updateMetrics(session: ExecutionSession): void {
    const completedAgents = Array.from(session.agents.values()).filter(
      a => a.status === 'completed'
    );

    if (completedAgents.length === 0) return;

    const durations = completedAgents.map(a => a.duration || 0);
    const tokens = completedAgents.map(a => a.metrics.tokensUsed);
    const costs = completedAgents.map(a => a.metrics.cost);

    session.metrics.avgAgentDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    session.metrics.maxAgentDuration = Math.max(...durations);
    session.metrics.minAgentDuration = Math.min(...durations);

    session.metrics.totalTokens = tokens.reduce((a, b) => a + b, 0);
    session.metrics.totalCost = costs.reduce((a, b) => a + b, 0);
    session.metrics.costPerAgent = session.metrics.totalCost / completedAgents.length;

    if (session.duration) {
      session.metrics.totalDuration = session.duration;
      session.metrics.throughput = (completedAgents.length / session.duration) * 1000; // agents/second
    }

    this.notifyUpdate(session.id, {
      type: 'metrics',
      data: session.metrics,
    });
  }

  // ============================================================================
  // Timeline
  // ============================================================================

  /**
   * Add timeline event
   */
  private addTimelineEvent(session: ExecutionSession, event: Omit<TimelineEvent, 'id' | 'timestamp'>): void {
    if (!session.config.enableTimeline) return;

    const timelineEvent: TimelineEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...event,
    };

    session.timeline.push(timelineEvent);

    // Trim timeline if exceeds max
    if (session.timeline.length > session.config.maxTimelineEvents) {
      session.timeline.shift();
    }
  }

  // ============================================================================
  // Real-Time Updates
  // ============================================================================

  /**
   * Subscribe to execution updates
   */
  subscribe(sessionId: string, callback: (update: ExecutionUpdate) => void): () => void {
    const callbackId = `${sessionId}-${Date.now()}`;
    this.updateCallbacks.set(callbackId, callback);

    // Return unsubscribe function
    return () => {
      this.updateCallbacks.delete(callbackId);
    };
  }

  /**
   * Notify update
   */
  private notifyUpdate(sessionId: string, update: Omit<ExecutionUpdate, 'sessionId' | 'timestamp'>): void {
    const fullUpdate: ExecutionUpdate = {
      sessionId,
      timestamp: new Date().toISOString(),
      ...update,
    };

    for (const [id, callback] of this.updateCallbacks.entries()) {
      if (id.startsWith(sessionId)) {
        callback(fullUpdate);
      }
    }
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get statistics
   */
  getStats(): {
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    failedSessions: number;
  } {
    const sessions = Array.from(this.sessions.values());

    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'running' || s.status === 'paused').length,
      completedSessions: sessions.filter(s => s.status === 'completed').length,
      failedSessions: sessions.filter(s => s.status === 'failed').length,
    };
  }

  /**
   * Clear old sessions
   */
  clearOldSessions(olderThan: number = 3600000): number {
    let cleared = 0;
    const now = Date.now();

    for (const [id, session] of this.sessions.entries()) {
      if (session.status === 'completed' || session.status === 'failed' || session.status === 'cancelled') {
        const sessionTime = new Date(session.completedAt || session.startedAt).getTime();
        if (now - sessionTime > olderThan) {
          this.sessions.delete(id);
          cleared++;
        }
      }
    }

    return cleared;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const executionMonitor = new ExecutionMonitor();
