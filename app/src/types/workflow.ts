import type { Node, Edge } from 'reactflow';

/**
 * Agent roles based on 2025 multi-agent research patterns
 */
export type AgentRole =
  | 'orchestrator'   // Coordinates workflow, delegates tasks
  | 'architect'      // Designs solutions, creates ADRs
  | 'critic'         // Reviews outputs, identifies gaps
  | 'red-team'       // Stress tests, finds edge cases
  | 'researcher'     // Gathers information, analyzes data
  | 'coder'          // Implements solutions, writes code
  | 'tester'         // Validates implementations, runs tests
  | 'writer'         // Creates documentation, reports
  | 'worker'         // Generic specialized task execution
  | 'finalizer'      // Aggregates results, produces final output
  | 'loop';          // Iterative execution until condition met

/**
 * Orchestration modes from research
 */
export type OrchestrationMode =
  | 'sequential'     // Agents execute in order (chain)
  | 'orchestrator'   // Central coordinator pattern
  | 'state-machine'  // LangGraph-style stateful
  | 'parallel';      // Fork-join pattern

/**
 * Artifact types for state passing
 */
export interface Artifact {
  id: string;
  name: string;
  type: 'document' | 'code' | 'data' | 'test' | 'other';
  path: string;
  createdBy: string;
  timestamp: number;
  content?: string;
}

/**
 * Workflow state for stateful orchestration
 */
export interface WorkflowState {
  objective: string;
  currentPhase: 'planning' | 'execution' | 'review' | 'complete';
  artifacts: Artifact[];
  decisions: string[];
  nextAction: string;
  variables: Record<string, string>;
}

/**
 * Agent node configuration
 */
export interface AgentNodeData {
  label: string;
  role: AgentRole;
  promptTemplate: string;
  description?: string;
  domain?: string;           // Specialization/expertise domain

  // Configuration
  config: {
    thinkingMode: 'minimal' | 'balanced' | 'extended';
    parallel: boolean;
    timeout?: number;        // Max execution time
    retries?: number;        // Retry count on failure
  };

  // Input/Output
  inputs: string[];          // Artifact IDs or variable names
  outputs: string[];         // Artifact names to create

  // Validation
  successCriteria?: string;  // How to validate output
  onFailure?: 'retry' | 'skip' | 'abort';
}

/**
 * Edge data for conditional routing and advanced multi-agent communication
 * Properties organized by tier: 🔴 Critical, 🟡 Important, 🟢 Nice-to-Have
 */
export interface WorkflowEdgeData {
  // ========== BASIC PROPERTIES (Existing) ==========
  label?: string;
  condition?: string;        // JavaScript expression
  priority?: number;         // For parallel edges
  transform?: string;        // Data transformation

  // Loop-specific metadata
  isLoopEdge?: boolean;      // Marks this edge as part of a loop
  loopId?: string;           // ID of associated loop controller
  loopRole?: 'entry' | 'iterate' | 'return' | 'exit';  // Role in loop execution

  // ========== TIER 1: CRITICAL (Error Handling & Resilience) 🔴 ==========

  /**
   * Retry policy for handling transient failures
   * Research: AWS Step Functions, Temporal (2024)
   */
  retryPolicy?: {
    maxAttempts?: number;              // Default: 3, Range: 1-10
    backoffType?: 'exponential' | 'linear' | 'fixed';  // Default: exponential
    initialIntervalMs?: number;        // Default: 1000ms
    backoffCoefficient?: number;       // Default: 2.0 (for exponential)
    maxIntervalMs?: number;            // Default: 100000ms (100s)
    jitter?: boolean;                  // Default: true (prevents thundering herd)
    retryableErrors?: string[];        // Error codes/types that trigger retry
    nonRetryableErrors?: string[];     // Permanent failures (no retry)
  };

  /**
   * Circuit breaker pattern to prevent cascade failures
   * Research: Resilience4j, Spring Boot (2024)
   */
  circuitBreaker?: {
    enabled?: boolean;                 // Default: false
    failureThreshold?: number;         // Default: 0.5 (50%), Range: 0.0-1.0
    halfOpenTimeoutMs?: number;        // Default: 30000ms (30s)
    successThreshold?: number;         // Default: 3 (successes to close circuit)
  };

  /**
   * Fallback mechanism for graceful degradation
   */
  fallback?: {
    enabled?: boolean;                 // Default: false
    strategy?: 'cached-data' | 'default-value' | 'skip' | 'alternative-agent';
    fallbackEdgeId?: string;           // Alternative edge to take on failure
    fallbackValue?: unknown;           // Default value (for default-value strategy)
  };

  /**
   * Timeout configuration to prevent hanging operations
   */
  timeout?: {
    executionTimeoutMs?: number;       // Default: 30000ms, Max time for edge traversal
    responseTimeoutMs?: number;        // Default: 25000ms, Max time waiting for response
    totalTimeoutMs?: number;           // Default: 120000ms, End-to-end including retries
  };

  /**
   * Observability configuration (OpenTelemetry compatible)
   * Research: Microsoft Semantic Kernel OTel integration (2024)
   */
  observability?: {
    traceContext?: {
      enabled?: boolean;               // Default: true
      traceId?: string;                // UUID for workflow trace
      spanId?: string;                 // UUID for this edge
      parentSpanId?: string;           // Parent span for correlation
      samplingRate?: number;           // Default: 1.0, Range: 0.0-1.0
    };
    logging?: {
      enabled?: boolean;               // Default: true
      logLevel?: 'debug' | 'info' | 'warn' | 'error';  // Default: info
      logEvents?: ('traversal-start' | 'traversal-complete' | 'condition-evaluation' | 'retry-attempt' | 'error' | 'circuit-breaker-state-change')[];
    };
    metrics?: {
      enabled?: boolean;               // Default: true
      captureLatency?: boolean;        // Default: true
      captureErrorRate?: boolean;      // Default: true
      captureTraversalCount?: boolean; // Default: true
      captureMessageSize?: boolean;    // Default: false
    };
  };

  // ========== TIER 2: IMPORTANT (Communication & Security) 🟡 ==========

  /**
   * Communication protocol configuration
   * Research: LangGraph state-based messaging (2024)
   */
  communication?: {
    messageType?: 'sync' | 'async' | 'streaming' | 'event-driven';  // Default: sync
    serializationFormat?: 'json' | 'msgpack' | 'protobuf';  // Default: json
    compressionEnabled?: boolean;      // Default: false
    schemaValidation?: {
      enabled?: boolean;               // Default: false
      schemaId?: string;               // Reference to JSON schema
      schemaVersion?: string;          // Schema version
      strictMode?: boolean;            // Default: true, Fail on validation errors
    };
  };

  /**
   * Rate limiting and throttling (token bucket algorithm)
   * Research: AWS API Gateway, Azure API Management (2024)
   */
  rateLimiting?: {
    enabled?: boolean;                 // Default: false
    requestsPerSecond?: number;        // Max throughput
    burstCapacity?: number;            // Max burst (token bucket capacity)
    queueStrategy?: 'drop' | 'queue' | 'backpressure';  // Default: queue
  };

  /**
   * Resource limits for edge execution
   */
  resourceLimits?: {
    maxConcurrentTraversals?: number;  // Max simultaneous uses of this edge
    maxMemoryMb?: number;              // Memory limit for edge processing
    maxTokens?: number;                // LLM token budget for this edge
  };

  /**
   * Security and access control
   * Research: McKinsey Agentic AI Security Report (2024-2025)
   */
  security?: {
    accessControl?: {
      requiredPermissions?: string[];  // Array of permission strings
      allowedSourceAgents?: string[];  // Whitelist of source agent IDs
      allowedTargetAgents?: string[];  // Whitelist of target agent IDs
      authenticationRequired?: boolean;  // Default: false
    };
    dataProtection?: {
      encryptInTransit?: boolean;      // Default: false, TLS 1.3+
      piiRedaction?: boolean;          // Default: false, Auto-redact PII
      dataRetentionDays?: number;      // How long to keep message logs
    };
    auditLogging?: {
      enabled?: boolean;               // Default: false
      fullTraceability?: boolean;      // Default: false, Record all state changes
      regulatoryFramework?: 'GDPR' | 'HIPAA' | 'SOC2' | 'none';  // Default: none
    };
  };

  // ========== TIER 3: NICE-TO-HAVE (Advanced Features) 🟢 ==========

  /**
   * Versioning and rollback support
   * Research: OpenAI Agent Builder (2024)
   */
  versioning?: {
    edgeVersion?: string;              // Semantic version (e.g., "1.2.3")
    rollbackEnabled?: boolean;         // Default: false
    previousVersionId?: string;        // Reference to parent version
  };

  /**
   * A/B testing and experimentation
   */
  experiment?: {
    experimentId?: string;             // Unique experiment identifier
    variantId?: string;                // 'control', 'variant-a', 'variant-b', etc.
    trafficAllocation?: number;        // Range: 0.0-1.0, % of traffic for this variant
    metricsToCompare?: string[];      // Success criteria for variants
  };

  /**
   * Streaming and real-time communication
   * Research: StreamNative, Confluent (2025)
   */
  streaming?: {
    enabled?: boolean;                 // Default: false
    chunkSize?: number;                // Size of streamed chunks
    bufferSize?: number;               // Buffer for backpressure
    protocol?: 'websocket' | 'sse' | 'grpc-stream';  // Default: websocket
  };

  /**
   * Event-driven architecture support
   */
  eventDriven?: {
    topic?: string;                    // Kafka/Pulsar topic for this edge
    eventType?: string;                // Type of events published
    publishStrategy?: 'fire-and-forget' | 'ack-required';  // Default: ack-required
  };

  /**
   * Cost tracking and budgeting
   */
  costTracking?: {
    enabled?: boolean;                 // Default: false
    costPerTraversal?: number;         // Fixed cost estimate
    tokenCostModel?: string;           // LLM token pricing model reference
    budgetLimit?: number;              // Max cost for this edge
  };

  /**
   * Performance optimization
   */
  performance?: {
    caching?: {
      enabled?: boolean;               // Default: false
      cacheTTL?: number;               // Cache lifetime in seconds
      cacheKey?: string;               // Key for cached results
    };
    prefetchEnabled?: boolean;         // Default: false, Preload target agent
  };

  /**
   * SLA/SLO tracking
   */
  sla?: {
    maxLatencyMs?: number;             // P99 latency target
    minAvailability?: number;          // Default: 0.999 (99.9%)
    maxErrorRate?: number;             // Default: 0.001 (0.1%)
  };

  /**
   * Advanced routing strategies
   * Research: STRMAC state-aware routing (2024)
   */
  advancedRouting?: {
    routingStrategy?: 'conditional' | 'load-balanced' | 'semantic' | 'state-aware';
    loadBalancing?: {
      algorithm?: 'round-robin' | 'least-connections' | 'weighted';
      weights?: Record<string, number>;  // Agent ID -> weight mapping
    };
    stateRequirements?: string[];      // Required state keys before traversal
    adaptiveRouting?: boolean;         // Default: false, Learn from executions
  };
}

/**
 * React Flow types with our data
 */
export type WorkflowNode = Node<AgentNodeData>;
export type WorkflowEdge = Edge<WorkflowEdgeData>;

/**
 * Complete workflow graph
 */
export interface WorkflowGraph {
  id: string;
  name: string;
  description?: string;
  mode: OrchestrationMode;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  state?: WorkflowState;
  createdAt: number;
  updatedAt: number;
}

/**
 * Workflow validation result
 */
export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Agent prompt template
 */
export interface AgentTemplate {
  id: string;
  role: AgentRole;
  name: string;
  description: string;
  promptTemplate: string;
  defaultConfig: Partial<AgentNodeData['config']>;
  tags: string[];
}
