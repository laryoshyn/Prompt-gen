import { useState, useEffect } from 'react';
import { useWorkflowStore } from '@/store/workflowStore';
import type {
  ExecutionSession,
  AgentExecutionState,
  ExecutionLog,
  ExecutionMetrics,
  AgentStatus,
  LogLevel,
} from '@/lib/workflow/executionMonitoring';

/**
 * Real-Time Execution Monitoring Panel
 *
 * Live monitoring dashboard for workflow execution with metrics,
 * progress tracking, logs, and debugging capabilities.
 *
 * Features:
 * - Live execution status
 * - Agent progress visualization
 * - Real-time metrics (tokens, cost, timing)
 * - Log streaming with filtering
 * - Error tracking
 * - Timeline visualization
 * - Execution controls (pause, resume, cancel)
 */

interface ExecutionMonitoringPanelProps {
  sessionId?: string;
  onClose: () => void;
}

type ViewMode = 'overview' | 'agents' | 'logs' | 'metrics' | 'timeline';

export function ExecutionMonitoringPanel({ sessionId, onClose }: ExecutionMonitoringPanelProps) {
  const {
    getExecutionSession,
    getExecutionLogs,
    pauseExecution,
    resumeExecution,
    cancelExecution,
  } = useWorkflowStore();

  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [session, setSession] = useState<ExecutionSession | null>(null);
  const [logFilter, setLogFilter] = useState<LogLevel | 'all'>('all');
  const [autoScroll, setAutoScroll] = useState(true);

  // Fetch session data
  useEffect(() => {
    if (sessionId) {
      const sessionData = getExecutionSession(sessionId);
      setSession(sessionData);
    }

    // Poll for updates every second
    const interval = setInterval(() => {
      if (sessionId) {
        const sessionData = getExecutionSession(sessionId);
        setSession(sessionData);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionId]);

  if (!session) {
    return (
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-12 text-center text-gray-500">
          <p className="text-lg">No active execution session</p>
          <p className="text-sm mt-2">Start a workflow to see live monitoring</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const getAgentStatusColor = (status: AgentStatus) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'pending':
        return 'bg-gray-300';
      case 'skipped':
        return 'bg-gray-400';
    }
  };

  const progress = (session.completedAgents / session.totalAgents) * 100;
  const agents = Array.from(session.agents.values());

  return (
    <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">⚡ Live Execution Monitor</h2>
          <p className="text-sm text-gray-600 mt-1">{session.workflowName}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 text-sm rounded-full border ${getStatusColor(session.status)}`}>
            {session.status.toUpperCase()}
          </span>
          {session.status === 'running' && (
            <button
              onClick={() => pauseExecution(session.id)}
              className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              ⏸️ Pause
            </button>
          )}
          {session.status === 'paused' && (
            <button
              onClick={() => resumeExecution(session.id)}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              ▶️ Resume
            </button>
          )}
          {(session.status === 'running' || session.status === 'paused') && (
            <button
              onClick={() => cancelExecution(session.id)}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              ⏹️ Cancel
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex border-b border-gray-200 bg-gray-50 px-6">
        <button
          onClick={() => setViewMode('overview')}
          className={`px-4 py-3 text-sm font-medium border-b-2 ${
            viewMode === 'overview'
              ? 'border-blue-500 text-blue-700'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          📊 Overview
        </button>
        <button
          onClick={() => setViewMode('agents')}
          className={`px-4 py-3 text-sm font-medium border-b-2 ${
            viewMode === 'agents'
              ? 'border-blue-500 text-blue-700'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          🤖 Agents ({session.totalAgents})
        </button>
        <button
          onClick={() => setViewMode('logs')}
          className={`px-4 py-3 text-sm font-medium border-b-2 ${
            viewMode === 'logs'
              ? 'border-blue-500 text-blue-700'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          📝 Logs ({session.logs.length})
        </button>
        <button
          onClick={() => setViewMode('metrics')}
          className={`px-4 py-3 text-sm font-medium border-b-2 ${
            viewMode === 'metrics'
              ? 'border-blue-500 text-blue-700'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          📈 Metrics
        </button>
        <button
          onClick={() => setViewMode('timeline')}
          className={`px-4 py-3 text-sm font-medium border-b-2 ${
            viewMode === 'timeline'
              ? 'border-blue-500 text-blue-700'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          ⏱️ Timeline ({session.timeline.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Overview */}
        {viewMode === 'overview' && (
          <div className="space-y-6">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">Progress</span>
                <span className="text-gray-600">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{session.completedAgents} completed</span>
                <span>{session.failedAgents} failed</span>
                <span>{session.totalAgents - session.completedAgents - session.failedAgents} remaining</span>
              </div>
            </div>

            {/* Current Agent */}
            {session.currentAgent && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900 mb-2">Currently Running:</p>
                <p className="text-lg font-bold text-blue-800">
                  {agents.find(a => a.agentId === session.currentAgent)?.agentLabel}
                </p>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">Duration</p>
                <p className="text-2xl font-bold text-gray-900">
                  {session.duration
                    ? `${(session.duration / 1000).toFixed(1)}s`
                    : `${((Date.now() - new Date(session.startedAt).getTime()) / 1000).toFixed(1)}s`}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">Tokens Used</p>
                <p className="text-2xl font-bold text-gray-900">
                  {session.metrics.totalTokens.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${session.metrics.totalCost.toFixed(4)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">Throughput</p>
                <p className="text-2xl font-bold text-gray-900">
                  {session.metrics.throughput.toFixed(2)} <span className="text-sm">agents/s</span>
                </p>
              </div>
            </div>

            {/* Recent Errors */}
            {session.errors.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Errors</h3>
                <div className="space-y-2">
                  {session.errors.slice(-3).reverse().map(error => (
                    <div key={error.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-sm font-semibold text-red-900">{error.type}</p>
                        <span className="text-xs text-red-600">
                          {new Date(error.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-red-800">{error.message}</p>
                      {error.agentId && (
                        <p className="text-xs text-red-600 mt-1">
                          Agent: {agents.find(a => a.agentId === error.agentId)?.agentLabel}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agent Status Overview */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Agent Status</h3>
              <div className="grid grid-cols-5 gap-2">
                {agents.map(agent => (
                  <div
                    key={agent.agentId}
                    className="text-center p-2 rounded border border-gray-200 hover:border-blue-300"
                  >
                    <div className={`w-full h-2 rounded mb-2 ${getAgentStatusColor(agent.status)}`} />
                    <p className="text-xs font-medium text-gray-900 truncate">{agent.agentLabel}</p>
                    <p className="text-xs text-gray-500">{agent.status}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Agents View */}
        {viewMode === 'agents' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Agent Execution Details</h3>
            <div className="grid gap-4">
              {agents.map(agent => (
                <div
                  key={agent.agentId}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{agent.agentLabel}</h4>
                      <p className="text-xs text-gray-500">{agent.agentRole}</p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded ${getStatusColor(agent.status)}`}
                    >
                      {agent.status.toUpperCase()}
                    </span>
                  </div>

                  {agent.status !== 'pending' && (
                    <div className="grid grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-gray-600">Duration</p>
                        <p className="font-semibold text-gray-900">
                          {agent.duration ? `${agent.duration}ms` : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Tokens</p>
                        <p className="font-semibold text-gray-900">{agent.metrics.tokensUsed}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Cost</p>
                        <p className="font-semibold text-gray-900">${agent.metrics.cost.toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Artifacts</p>
                        <p className="font-semibold text-gray-900">{agent.artifacts.length}</p>
                      </div>
                    </div>
                  )}

                  {agent.error && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-xs text-red-800">{agent.error.message}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logs View */}
        {viewMode === 'logs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Execution Logs</h3>
              <div className="flex gap-2">
                <select
                  value={logFilter}
                  onChange={e => setLogFilter(e.target.value as LogLevel | 'all')}
                  className="px-3 py-1 text-sm border border-gray-300 rounded"
                >
                  <option value="all">All Levels</option>
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warn">Warn</option>
                  <option value="error">Error</option>
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={e => setAutoScroll(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Auto-scroll
                </label>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-gray-100 max-h-96 overflow-y-auto">
              {session.logs
                .filter(log => logFilter === 'all' || log.level === logFilter)
                .map(log => {
                  const levelColor =
                    log.level === 'error'
                      ? 'text-red-400'
                      : log.level === 'warn'
                      ? 'text-yellow-400'
                      : log.level === 'info'
                      ? 'text-blue-400'
                      : 'text-gray-400';

                  return (
                    <div key={log.id} className="mb-1 hover:bg-gray-800">
                      <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className={`ml-2 ${levelColor}`}>[{log.level.toUpperCase()}]</span>
                      <span className="ml-2 text-gray-400">{log.source}:</span>
                      <span className="ml-2">{log.message}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Metrics View */}
        {viewMode === 'metrics' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>

            {/* Timing Metrics */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Timing</h4>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Total Duration</p>
                  <p className="text-xl font-bold text-gray-900">
                    {session.metrics.totalDuration
                      ? `${(session.metrics.totalDuration / 1000).toFixed(2)}s`
                      : '-'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Avg Agent Duration</p>
                  <p className="text-xl font-bold text-gray-900">
                    {session.metrics.avgAgentDuration.toFixed(0)}ms
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Max Agent Duration</p>
                  <p className="text-xl font-bold text-gray-900">
                    {session.metrics.maxAgentDuration === Infinity
                      ? '-'
                      : `${session.metrics.maxAgentDuration.toFixed(0)}ms`}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Min Agent Duration</p>
                  <p className="text-xl font-bold text-gray-900">
                    {session.metrics.minAgentDuration === Infinity
                      ? '-'
                      : `${session.metrics.minAgentDuration.toFixed(0)}ms`}
                  </p>
                </div>
              </div>
            </div>

            {/* Token Metrics */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Tokens</h4>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs text-blue-600 mb-1">Total Tokens</p>
                  <p className="text-xl font-bold text-blue-900">
                    {session.metrics.totalTokens.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Input Tokens</p>
                  <p className="text-xl font-bold text-gray-900">
                    {session.metrics.inputTokens.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Output Tokens</p>
                  <p className="text-xl font-bold text-gray-900">
                    {session.metrics.outputTokens.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Thinking Tokens</p>
                  <p className="text-xl font-bold text-gray-900">
                    {session.metrics.thinkingTokens.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Cost Metrics */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Cost</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-xs text-green-600 mb-1">Total Cost</p>
                  <p className="text-2xl font-bold text-green-900">
                    ${session.metrics.totalCost.toFixed(4)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Cost per Agent</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${session.metrics.costPerAgent.toFixed(4)}
                  </p>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Performance</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-xs text-purple-600 mb-1">Throughput</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {session.metrics.throughput.toFixed(2)} <span className="text-sm">agents/s</span>
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 mb-1">Parallelism Factor</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {session.metrics.parallelismFactor.toFixed(2)}x
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Execution Timeline</h3>
            <div className="relative pl-8 border-l-2 border-gray-300 space-y-6">
              {session.timeline.map(event => {
                const typeColor =
                  event.type === 'start'
                    ? 'bg-blue-500'
                    : event.type === 'complete'
                    ? 'bg-green-500'
                    : event.type === 'fail' || event.type === 'agent-fail'
                    ? 'bg-red-500'
                    : event.type === 'pause'
                    ? 'bg-yellow-500'
                    : 'bg-gray-400';

                return (
                  <div key={event.id} className="relative">
                    <div className={`absolute -left-9 w-4 h-4 rounded-full border-2 border-white ${typeColor}`} />
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-sm font-semibold text-gray-900">{event.description}</p>
                        <span className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {event.metadata && (
                        <pre className="text-xs text-gray-600 mt-2 overflow-x-auto">
                          {JSON.stringify(event.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-6 gap-4 text-center text-sm">
          <div>
            <p className="text-gray-600">Completed</p>
            <p className="text-lg font-semibold text-green-600">{session.completedAgents}</p>
          </div>
          <div>
            <p className="text-gray-600">Failed</p>
            <p className="text-lg font-semibold text-red-600">{session.failedAgents}</p>
          </div>
          <div>
            <p className="text-gray-600">Remaining</p>
            <p className="text-lg font-semibold text-gray-900">
              {session.totalAgents - session.completedAgents - session.failedAgents}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Tokens</p>
            <p className="text-lg font-semibold text-gray-900">
              {session.metrics.totalTokens.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Cost</p>
            <p className="text-lg font-semibold text-gray-900">${session.metrics.totalCost.toFixed(3)}</p>
          </div>
          <div>
            <p className="text-gray-600">Errors</p>
            <p className="text-lg font-semibold text-red-600">{session.errors.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
