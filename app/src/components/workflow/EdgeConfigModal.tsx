import { useState, useEffect } from 'react';
import type { WorkflowEdge, WorkflowEdgeData } from '@/types/workflow';
import { useWorkflowStore } from '@/store/workflowStore';
import { validateEdgeData, getValidationSummary } from '@/lib/workflow/edgeValidator';

interface EdgeConfigModalProps {
  edge: WorkflowEdge;
  onClose: () => void;
}

type TabId = 'basic' | 'resilience' | 'communication' | 'security' | 'advanced';

export function EdgeConfigModal({ edge, onClose }: EdgeConfigModalProps) {
  const updateEdgeData = useWorkflowStore((state) => state.updateEdgeData);
  const deleteEdge = useWorkflowStore((state) => state.deleteEdge);
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);

  const [activeTab, setActiveTab] = useState<TabId>('basic');

  // Basic tab state
  const [label, setLabel] = useState('');
  const [condition, setCondition] = useState('');
  const [priority, setPriority] = useState('');
  const [isLoopEdge, setIsLoopEdge] = useState(false);
  const [loopRole, setLoopRole] = useState<'entry' | 'iterate' | 'return' | 'exit'>('entry');

  // Resilience tab state
  const [retryEnabled, setRetryEnabled] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState('3');
  const [backoffType, setBackoffType] = useState<'exponential' | 'linear' | 'fixed'>('exponential');
  const [initialIntervalMs, setInitialIntervalMs] = useState('1000');
  const [backoffCoefficient, setBackoffCoefficient] = useState('2.0');
  const [jitter, setJitter] = useState(true);

  const [circuitBreakerEnabled, setCircuitBreakerEnabled] = useState(false);
  const [failureThreshold, setFailureThreshold] = useState('0.5');
  const [halfOpenTimeoutMs, setHalfOpenTimeoutMs] = useState('30000');
  const [successThreshold, setSuccessThreshold] = useState('3');

  const [fallbackEnabled, setFallbackEnabled] = useState(false);
  const [fallbackStrategy, setFallbackStrategy] = useState<'cached-data' | 'default-value' | 'skip' | 'alternative-agent'>('skip');
  const [fallbackEdgeId, setFallbackEdgeId] = useState('');

  const [executionTimeoutMs, setExecutionTimeoutMs] = useState('30000');
  const [responseTimeoutMs, setResponseTimeoutMs] = useState('25000');
  const [totalTimeoutMs, setTotalTimeoutMs] = useState('120000');

  // Communication tab state
  const [messageType, setMessageType] = useState<'sync' | 'async' | 'streaming' | 'event-driven'>('sync');
  const [serializationFormat, setSerializationFormat] = useState<'json' | 'msgpack' | 'protobuf'>('json');
  const [compressionEnabled, setCompressionEnabled] = useState(false);
  const [schemaValidationEnabled, setSchemaValidationEnabled] = useState(false);
  const [schemaId, setSchemaId] = useState('');

  const [rateLimitingEnabled, setRateLimitingEnabled] = useState(false);
  const [requestsPerSecond, setRequestsPerSecond] = useState('');
  const [burstCapacity, setBurstCapacity] = useState('');
  const [queueStrategy, setQueueStrategy] = useState<'drop' | 'queue' | 'backpressure'>('queue');

  const [maxConcurrentTraversals, setMaxConcurrentTraversals] = useState('');
  const [maxMemoryMb, setMaxMemoryMb] = useState('');
  const [maxTokens, setMaxTokens] = useState('');

  // Security tab state
  const [authenticationRequired, setAuthenticationRequired] = useState(false);
  const [encryptInTransit, setEncryptInTransit] = useState(false);
  const [piiRedaction, setPiiRedaction] = useState(false);
  const [auditLoggingEnabled, setAuditLoggingEnabled] = useState(false);
  const [regulatoryFramework, setRegulatoryFramework] = useState<'GDPR' | 'HIPAA' | 'SOC2' | 'none'>('none');

  // Advanced tab state
  const [edgeVersion, setEdgeVersion] = useState('');
  const [experimentId, setExperimentId] = useState('');
  const [trafficAllocation, setTrafficAllocation] = useState('');
  const [streamingEnabled, setStreamingEnabled] = useState(false);
  const [costTrackingEnabled, setCostTrackingEnabled] = useState(false);

  // Find source and target nodes
  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);

  // Populate form from edge data
  useEffect(() => {
    if (edge.data) {
      // Basic
      setLabel(edge.data.label || '');
      setCondition(edge.data.condition || '');
      setPriority(edge.data.priority?.toString() || '');
      setIsLoopEdge(edge.data.isLoopEdge || false);
      setLoopRole(edge.data.loopRole || 'entry');

      // Resilience
      setRetryEnabled(edge.data.retryPolicy !== undefined);
      setMaxAttempts(edge.data.retryPolicy?.maxAttempts?.toString() || '3');
      setBackoffType(edge.data.retryPolicy?.backoffType || 'exponential');
      setInitialIntervalMs(edge.data.retryPolicy?.initialIntervalMs?.toString() || '1000');
      setBackoffCoefficient(edge.data.retryPolicy?.backoffCoefficient?.toString() || '2.0');
      setJitter(edge.data.retryPolicy?.jitter ?? true);

      setCircuitBreakerEnabled(edge.data.circuitBreaker?.enabled || false);
      setFailureThreshold(edge.data.circuitBreaker?.failureThreshold?.toString() || '0.5');
      setHalfOpenTimeoutMs(edge.data.circuitBreaker?.halfOpenTimeoutMs?.toString() || '30000');
      setSuccessThreshold(edge.data.circuitBreaker?.successThreshold?.toString() || '3');

      setFallbackEnabled(edge.data.fallback?.enabled || false);
      setFallbackStrategy(edge.data.fallback?.strategy || 'skip');
      setFallbackEdgeId(edge.data.fallback?.fallbackEdgeId || '');

      setExecutionTimeoutMs(edge.data.timeout?.executionTimeoutMs?.toString() || '30000');
      setResponseTimeoutMs(edge.data.timeout?.responseTimeoutMs?.toString() || '25000');
      setTotalTimeoutMs(edge.data.timeout?.totalTimeoutMs?.toString() || '120000');

      // Communication
      setMessageType(edge.data.communication?.messageType || 'sync');
      setSerializationFormat(edge.data.communication?.serializationFormat || 'json');
      setCompressionEnabled(edge.data.communication?.compressionEnabled || false);
      setSchemaValidationEnabled(edge.data.communication?.schemaValidation?.enabled || false);
      setSchemaId(edge.data.communication?.schemaValidation?.schemaId || '');

      setRateLimitingEnabled(edge.data.rateLimiting?.enabled || false);
      setRequestsPerSecond(edge.data.rateLimiting?.requestsPerSecond?.toString() || '');
      setBurstCapacity(edge.data.rateLimiting?.burstCapacity?.toString() || '');
      setQueueStrategy(edge.data.rateLimiting?.queueStrategy || 'queue');

      setMaxConcurrentTraversals(edge.data.resourceLimits?.maxConcurrentTraversals?.toString() || '');
      setMaxMemoryMb(edge.data.resourceLimits?.maxMemoryMb?.toString() || '');
      setMaxTokens(edge.data.resourceLimits?.maxTokens?.toString() || '');

      // Security
      setAuthenticationRequired(edge.data.security?.accessControl?.authenticationRequired || false);
      setEncryptInTransit(edge.data.security?.dataProtection?.encryptInTransit || false);
      setPiiRedaction(edge.data.security?.dataProtection?.piiRedaction || false);
      setAuditLoggingEnabled(edge.data.security?.auditLogging?.enabled || false);
      setRegulatoryFramework(edge.data.security?.auditLogging?.regulatoryFramework || 'none');

      // Advanced
      setEdgeVersion(edge.data.versioning?.edgeVersion || '');
      setExperimentId(edge.data.experiment?.experimentId || '');
      setTrafficAllocation(edge.data.experiment?.trafficAllocation?.toString() || '');
      setStreamingEnabled(edge.data.streaming?.enabled || false);
      setCostTrackingEnabled(edge.data.costTracking?.enabled || false);
    }
  }, [edge]);

  const handleSave = () => {
    const updatedData: Partial<WorkflowEdgeData> = {
      // Basic
      label: label.trim() || undefined,
      condition: condition.trim() || undefined,
      priority: priority ? parseInt(priority, 10) : undefined,
      isLoopEdge: isLoopEdge || undefined,
      loopRole: isLoopEdge ? loopRole : undefined,

      // Resilience
      retryPolicy: retryEnabled ? {
        maxAttempts: parseInt(maxAttempts) || 3,
        backoffType,
        initialIntervalMs: parseInt(initialIntervalMs) || 1000,
        backoffCoefficient: parseFloat(backoffCoefficient) || 2.0,
        jitter,
      } : undefined,

      circuitBreaker: circuitBreakerEnabled ? {
        enabled: true,
        failureThreshold: parseFloat(failureThreshold) || 0.5,
        halfOpenTimeoutMs: parseInt(halfOpenTimeoutMs) || 30000,
        successThreshold: parseInt(successThreshold) || 3,
      } : undefined,

      fallback: fallbackEnabled ? {
        enabled: true,
        strategy: fallbackStrategy,
        fallbackEdgeId: fallbackEdgeId || undefined,
      } : undefined,

      timeout: {
        executionTimeoutMs: parseInt(executionTimeoutMs) || 30000,
        responseTimeoutMs: parseInt(responseTimeoutMs) || 25000,
        totalTimeoutMs: parseInt(totalTimeoutMs) || 120000,
      },

      // Communication
      communication: {
        messageType,
        serializationFormat,
        compressionEnabled,
        schemaValidation: schemaValidationEnabled ? {
          enabled: true,
          schemaId: schemaId || undefined,
        } : undefined,
      },

      rateLimiting: rateLimitingEnabled ? {
        enabled: true,
        requestsPerSecond: requestsPerSecond ? parseFloat(requestsPerSecond) : undefined,
        burstCapacity: burstCapacity ? parseInt(burstCapacity) : undefined,
        queueStrategy,
      } : undefined,

      resourceLimits: {
        maxConcurrentTraversals: maxConcurrentTraversals ? parseInt(maxConcurrentTraversals) : undefined,
        maxMemoryMb: maxMemoryMb ? parseInt(maxMemoryMb) : undefined,
        maxTokens: maxTokens ? parseInt(maxTokens) : undefined,
      },

      // Security
      security: {
        accessControl: {
          authenticationRequired,
        },
        dataProtection: {
          encryptInTransit,
          piiRedaction,
        },
        auditLogging: {
          enabled: auditLoggingEnabled,
          regulatoryFramework,
        },
      },

      // Advanced
      versioning: edgeVersion ? {
        edgeVersion,
      } : undefined,

      experiment: experimentId ? {
        experimentId,
        trafficAllocation: trafficAllocation ? parseFloat(trafficAllocation) : undefined,
      } : undefined,

      streaming: {
        enabled: streamingEnabled,
      },

      costTracking: {
        enabled: costTrackingEnabled,
      },
    };

    // Validate before saving
    const validation = validateEdgeData(updatedData, nodes);
    if (!validation.isValid) {
      const errorMessages = validation.errors.map(e => `${e.property}: ${e.message}`).join('\n');
      alert(`Validation errors:\n\n${errorMessages}`);
      return;
    }

    updateEdgeData(edge.id, updatedData);
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this edge? This action cannot be undone.')) {
      deleteEdge(edge.id);
      onClose();
    }
  };

  // Get other edges for fallback selection
  const availableEdges = edges.filter(e => e.id !== edge.id);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold mb-2">Configure Edge</h2>

          {/* Connection Info */}
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <div className="font-medium text-gray-700 mb-1">Connection</div>
            <div className="text-gray-600">
              <div className="mb-1">
                <span className="font-medium">From:</span>{' '}
                {sourceNode ? (
                  <>
                    <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-semibold mr-1 capitalize">
                      {sourceNode.data.role.replace('-', ' ')}
                    </span>
                    <span className="font-semibold">{sourceNode.data.label}</span>
                    <span className="font-mono text-xs text-gray-500 ml-1">({edge.source})</span>
                  </>
                ) : (
                  <span className="font-mono text-xs">{edge.source}</span>
                )}
              </div>
              <div>
                <span className="font-medium">To:</span>{' '}
                {targetNode ? (
                  <>
                    <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-semibold mr-1 capitalize">
                      {targetNode.data.role.replace('-', ' ')}
                    </span>
                    <span className="font-semibold">{targetNode.data.label}</span>
                    <span className="font-mono text-xs text-gray-500 ml-1">({edge.target})</span>
                  </>
                ) : (
                  <span className="font-mono text-xs">{edge.target}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex px-6">
            {[
              { id: 'basic', label: 'Basic', badge: null },
              { id: 'resilience', label: 'Resilience', badge: '🔴' },
              { id: 'communication', label: 'Communication', badge: '🟡' },
              { id: 'security', label: 'Security', badge: '🟡' },
              { id: 'advanced', label: 'Advanced', badge: '🟢' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabId)}
                className={`
                  px-4 py-3 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }
                `}
              >
                {tab.label} {tab.badge && <span className="ml-1">{tab.badge}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Label (optional)
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g., success, failure, next"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Display label for this edge
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Condition (optional)
                </label>
                <textarea
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  placeholder="e.g., state.quality > 0.8 && state.iterations < 10"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  JavaScript expression evaluated at runtime
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority (optional)
                </label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  placeholder="e.g., 1"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Execution order when multiple edges exist (lower = higher priority)
                </p>
              </div>

              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="isLoopEdge"
                    checked={isLoopEdge}
                    onChange={(e) => setIsLoopEdge(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="isLoopEdge" className="ml-2 text-sm font-medium text-gray-700">
                    🔄 This is a loop edge
                  </label>
                </div>

                {isLoopEdge && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Loop Role
                    </label>
                    <select
                      value={loopRole}
                      onChange={(e) => setLoopRole(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="entry">Entry - Enters the loop</option>
                      <option value="iterate">Iterate - Repeats within loop</option>
                      <option value="return">Return - Returns to loop start</option>
                      <option value="exit">Exit - Exits the loop</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'resilience' && (
            <div className="space-y-6">
              {/* Retry Policy */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Retry Policy</h3>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={retryEnabled}
                      onChange={(e) => setRetryEnabled(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm">Enabled</span>
                  </label>
                </div>

                {retryEnabled && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Attempts
                        </label>
                        <input
                          type="number"
                          value={maxAttempts}
                          onChange={(e) => setMaxAttempts(e.target.value)}
                          min="1"
                          max="10"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Backoff Type
                        </label>
                        <select
                          value={backoffType}
                          onChange={(e) => setBackoffType(e.target.value as any)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="exponential">Exponential</option>
                          <option value="linear">Linear</option>
                          <option value="fixed">Fixed</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Initial Interval (ms)
                        </label>
                        <input
                          type="number"
                          value={initialIntervalMs}
                          onChange={(e) => setInitialIntervalMs(e.target.value)}
                          min="100"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Backoff Coefficient
                        </label>
                        <input
                          type="number"
                          value={backoffCoefficient}
                          onChange={(e) => setBackoffCoefficient(e.target.value)}
                          min="1"
                          step="0.1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="jitter"
                        checked={jitter}
                        onChange={(e) => setJitter(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <label htmlFor="jitter" className="ml-2 text-sm text-gray-700">
                        Enable jitter (prevents thundering herd)
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Circuit Breaker */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Circuit Breaker</h3>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={circuitBreakerEnabled}
                      onChange={(e) => setCircuitBreakerEnabled(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm">Enabled</span>
                  </label>
                </div>

                {circuitBreakerEnabled && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Failure Threshold (0.0-1.0)
                      </label>
                      <input
                        type="number"
                        value={failureThreshold}
                        onChange={(e) => setFailureThreshold(e.target.value)}
                        min="0"
                        max="1"
                        step="0.05"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">50% typical (0.5)</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Half-Open Timeout (ms)
                        </label>
                        <input
                          type="number"
                          value={halfOpenTimeoutMs}
                          onChange={(e) => setHalfOpenTimeoutMs(e.target.value)}
                          min="1000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Success Threshold
                        </label>
                        <input
                          type="number"
                          value={successThreshold}
                          onChange={(e) => setSuccessThreshold(e.target.value)}
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Fallback */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Fallback</h3>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={fallbackEnabled}
                      onChange={(e) => setFallbackEnabled(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm">Enabled</span>
                  </label>
                </div>

                {fallbackEnabled && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Strategy
                      </label>
                      <select
                        value={fallbackStrategy}
                        onChange={(e) => setFallbackStrategy(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="skip">Skip</option>
                        <option value="cached-data">Use Cached Data</option>
                        <option value="default-value">Use Default Value</option>
                        <option value="alternative-agent">Alternative Agent</option>
                      </select>
                    </div>

                    {fallbackStrategy === 'alternative-agent' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fallback Edge
                        </label>
                        <select
                          value={fallbackEdgeId}
                          onChange={(e) => setFallbackEdgeId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="">Select edge...</option>
                          {availableEdges.map(e => (
                            <option key={e.id} value={e.id}>
                              {e.data?.label || e.id}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Timeouts */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Timeouts</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Execution Timeout (ms)
                    </label>
                    <input
                      type="number"
                      value={executionTimeoutMs}
                      onChange={(e) => setExecutionTimeoutMs(e.target.value)}
                      min="1000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Response Timeout (ms)
                    </label>
                    <input
                      type="number"
                      value={responseTimeoutMs}
                      onChange={(e) => setResponseTimeoutMs(e.target.value)}
                      min="1000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">Must be ≤ execution timeout</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Timeout (ms)
                    </label>
                    <input
                      type="number"
                      value={totalTimeoutMs}
                      onChange={(e) => setTotalTimeoutMs(e.target.value)}
                      min="1000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">Should account for retries</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'communication' && (
            <div className="space-y-6">
              {/* Message Protocol */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Message Protocol</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message Type
                    </label>
                    <select
                      value={messageType}
                      onChange={(e) => setMessageType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="sync">Synchronous</option>
                      <option value="async">Asynchronous</option>
                      <option value="streaming">Streaming</option>
                      <option value="event-driven">Event-Driven</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Serialization Format
                    </label>
                    <select
                      value={serializationFormat}
                      onChange={(e) => setSerializationFormat(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="json">JSON</option>
                      <option value="msgpack">MessagePack</option>
                      <option value="protobuf">Protocol Buffers</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="compressionEnabled"
                      checked={compressionEnabled}
                      onChange={(e) => setCompressionEnabled(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label htmlFor="compressionEnabled" className="ml-2 text-sm text-gray-700">
                      Enable compression
                    </label>
                  </div>
                </div>
              </div>

              {/* Schema Validation */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Schema Validation</h3>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={schemaValidationEnabled}
                      onChange={(e) => setSchemaValidationEnabled(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm">Enabled</span>
                  </label>
                </div>

                {schemaValidationEnabled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Schema ID
                    </label>
                    <input
                      type="text"
                      value={schemaId}
                      onChange={(e) => setSchemaId(e.target.value)}
                      placeholder="e.g., agent-message-v1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Rate Limiting */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Rate Limiting</h3>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={rateLimitingEnabled}
                      onChange={(e) => setRateLimitingEnabled(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm">Enabled</span>
                  </label>
                </div>

                {rateLimitingEnabled && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Requests/Second
                        </label>
                        <input
                          type="number"
                          value={requestsPerSecond}
                          onChange={(e) => setRequestsPerSecond(e.target.value)}
                          min="1"
                          placeholder="10"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Burst Capacity
                        </label>
                        <input
                          type="number"
                          value={burstCapacity}
                          onChange={(e) => setBurstCapacity(e.target.value)}
                          min="1"
                          placeholder="20"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Queue Strategy
                      </label>
                      <select
                        value={queueStrategy}
                        onChange={(e) => setQueueStrategy(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="queue">Queue (buffer requests)</option>
                        <option value="drop">Drop (reject excess)</option>
                        <option value="backpressure">Backpressure (slow down)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Resource Limits */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Resource Limits</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Concurrent Traversals
                    </label>
                    <input
                      type="number"
                      value={maxConcurrentTraversals}
                      onChange={(e) => setMaxConcurrentTraversals(e.target.value)}
                      min="1"
                      placeholder="5"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Memory (MB)
                    </label>
                    <input
                      type="number"
                      value={maxMemoryMb}
                      onChange={(e) => setMaxMemoryMb(e.target.value)}
                      min="1"
                      placeholder="512"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Tokens (LLM Budget)
                    </label>
                    <input
                      type="number"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(e.target.value)}
                      min="1"
                      placeholder="2000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Access Control */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Access Control</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="authenticationRequired"
                      checked={authenticationRequired}
                      onChange={(e) => setAuthenticationRequired(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label htmlFor="authenticationRequired" className="ml-2 text-sm text-gray-700">
                      Require authentication
                    </label>
                  </div>
                </div>
              </div>

              {/* Data Protection */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Data Protection</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="encryptInTransit"
                      checked={encryptInTransit}
                      onChange={(e) => setEncryptInTransit(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label htmlFor="encryptInTransit" className="ml-2 text-sm text-gray-700">
                      Encrypt in transit (TLS 1.3+)
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="piiRedaction"
                      checked={piiRedaction}
                      onChange={(e) => setPiiRedaction(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label htmlFor="piiRedaction" className="ml-2 text-sm text-gray-700">
                      Auto-redact PII (personally identifiable information)
                    </label>
                  </div>
                </div>
              </div>

              {/* Audit Logging */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Audit Logging</h3>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={auditLoggingEnabled}
                      onChange={(e) => setAuditLoggingEnabled(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm">Enabled</span>
                  </label>
                </div>

                {auditLoggingEnabled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Regulatory Framework
                    </label>
                    <select
                      value={regulatoryFramework}
                      onChange={(e) => setRegulatoryFramework(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="none">None</option>
                      <option value="GDPR">GDPR (EU)</option>
                      <option value="HIPAA">HIPAA (US Healthcare)</option>
                      <option value="SOC2">SOC 2 (Security)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6">
              {/* Versioning */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Versioning</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Edge Version (Semantic)
                  </label>
                  <input
                    type="text"
                    value={edgeVersion}
                    onChange={(e) => setEdgeVersion(e.target.value)}
                    placeholder="e.g., 1.2.3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">Format: MAJOR.MINOR.PATCH</p>
                </div>
              </div>

              {/* A/B Testing */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">A/B Testing</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Experiment ID
                    </label>
                    <input
                      type="text"
                      value={experimentId}
                      onChange={(e) => setExperimentId(e.target.value)}
                      placeholder="e.g., experiment-123"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  {experimentId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Traffic Allocation (0.0-1.0)
                      </label>
                      <input
                        type="number"
                        value={trafficAllocation}
                        onChange={(e) => setTrafficAllocation(e.target.value)}
                        min="0"
                        max="1"
                        step="0.1"
                        placeholder="0.5"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">% of traffic for this variant</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Streaming */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Streaming</h3>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="streamingEnabled"
                    checked={streamingEnabled}
                    onChange={(e) => setStreamingEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="streamingEnabled" className="ml-2 text-sm text-gray-700">
                    Enable streaming (WebSocket, SSE, gRPC)
                  </label>
                </div>
              </div>

              {/* Cost Tracking */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Cost Tracking</h3>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="costTrackingEnabled"
                    checked={costTrackingEnabled}
                    onChange={(e) => setCostTrackingEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="costTrackingEnabled" className="ml-2 text-sm text-gray-700">
                    Enable cost tracking and budgeting
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t p-6">
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Save Configuration
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
              title="Delete this edge"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
