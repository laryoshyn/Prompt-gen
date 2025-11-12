import type { WorkflowEdgeData } from '@/types/workflow';

/**
 * Smart defaults for edge properties
 * Based on 2024-2025 industry research and best practices
 */

/**
 * Get default edge properties with sensible values
 * Users can override any of these via the UI
 */
export function getDefaultEdgeProperties(): Partial<WorkflowEdgeData> {
  return {
    // ========== TIER 1: CRITICAL (Smart Defaults Applied) 🔴 ==========

    retryPolicy: {
      maxAttempts: 3,
      backoffType: 'exponential',
      initialIntervalMs: 1000,
      backoffCoefficient: 2.0,
      maxIntervalMs: 100000,
      jitter: true,
      retryableErrors: ['TIMEOUT', 'RATE_LIMIT', 'SERVICE_UNAVAILABLE', 'TEMPORARY_FAILURE'],
      nonRetryableErrors: ['INVALID_INPUT', 'AUTHENTICATION_FAILED', 'PERMISSION_DENIED', 'NOT_FOUND'],
    },

    circuitBreaker: {
      enabled: false, // Disabled by default, user must explicitly enable
      failureThreshold: 0.5,
      halfOpenTimeoutMs: 30000,
      successThreshold: 3,
    },

    fallback: {
      enabled: false, // Disabled by default
      strategy: 'skip',
    },

    timeout: {
      executionTimeoutMs: 30000,  // 30 seconds
      responseTimeoutMs: 25000,   // 25 seconds (less than execution)
      totalTimeoutMs: 120000,     // 2 minutes (including retries)
    },

    observability: {
      traceContext: {
        enabled: true,
        samplingRate: 1.0, // 100% sampling by default (adjust for production)
      },
      logging: {
        enabled: true,
        logLevel: 'info',
        logEvents: ['traversal-start', 'traversal-complete', 'error'],
      },
      metrics: {
        enabled: true,
        captureLatency: true,
        captureErrorRate: true,
        captureTraversalCount: true,
        captureMessageSize: false, // Can be expensive
      },
    },

    // ========== TIER 2: IMPORTANT (Disabled by Default) 🟡 ==========

    communication: {
      messageType: 'sync',
      serializationFormat: 'json',
      compressionEnabled: false,
      schemaValidation: {
        enabled: false,
        strictMode: true,
      },
    },

    rateLimiting: {
      enabled: false,
      queueStrategy: 'queue',
    },

    resourceLimits: {
      // No defaults - user should configure based on needs
    },

    security: {
      accessControl: {
        authenticationRequired: false,
      },
      dataProtection: {
        encryptInTransit: false,
        piiRedaction: false,
      },
      auditLogging: {
        enabled: false,
        fullTraceability: false,
        regulatoryFramework: 'none',
      },
    },

    // ========== TIER 3: NICE-TO-HAVE (Disabled by Default) 🟢 ==========

    versioning: {
      rollbackEnabled: false,
    },

    experiment: {
      // No defaults - experimental features must be explicitly configured
    },

    streaming: {
      enabled: false,
      protocol: 'websocket',
    },

    eventDriven: {
      publishStrategy: 'ack-required',
    },

    costTracking: {
      enabled: false,
    },

    performance: {
      caching: {
        enabled: false,
      },
      prefetchEnabled: false,
    },

    sla: {
      minAvailability: 0.999,  // 99.9%
      maxErrorRate: 0.001,     // 0.1%
    },

    advancedRouting: {
      routingStrategy: 'conditional',
      adaptiveRouting: false,
    },
  };
}

/**
 * Merge user-provided edge data with defaults
 * Only applies defaults for properties that are undefined
 */
export function mergeWithDefaults(edgeData: Partial<WorkflowEdgeData>): Partial<WorkflowEdgeData> {
  const defaults = getDefaultEdgeProperties();

  return {
    ...edgeData,

    // Deep merge for nested objects
    retryPolicy: edgeData.retryPolicy
      ? { ...defaults.retryPolicy, ...edgeData.retryPolicy }
      : defaults.retryPolicy,

    circuitBreaker: edgeData.circuitBreaker
      ? { ...defaults.circuitBreaker, ...edgeData.circuitBreaker }
      : defaults.circuitBreaker,

    fallback: edgeData.fallback
      ? { ...defaults.fallback, ...edgeData.fallback }
      : defaults.fallback,

    timeout: edgeData.timeout
      ? { ...defaults.timeout, ...edgeData.timeout }
      : defaults.timeout,

    observability: edgeData.observability
      ? {
          traceContext: { ...defaults.observability!.traceContext, ...edgeData.observability.traceContext },
          logging: { ...defaults.observability!.logging, ...edgeData.observability.logging },
          metrics: { ...defaults.observability!.metrics, ...edgeData.observability.metrics },
        }
      : defaults.observability,

    communication: edgeData.communication
      ? {
          ...defaults.communication,
          ...edgeData.communication,
          schemaValidation: edgeData.communication.schemaValidation
            ? { ...defaults.communication!.schemaValidation, ...edgeData.communication.schemaValidation }
            : defaults.communication!.schemaValidation,
        }
      : defaults.communication,

    rateLimiting: edgeData.rateLimiting
      ? { ...defaults.rateLimiting, ...edgeData.rateLimiting }
      : defaults.rateLimiting,

    resourceLimits: edgeData.resourceLimits
      ? { ...defaults.resourceLimits, ...edgeData.resourceLimits }
      : defaults.resourceLimits,

    security: edgeData.security
      ? {
          accessControl: { ...defaults.security!.accessControl, ...edgeData.security.accessControl },
          dataProtection: { ...defaults.security!.dataProtection, ...edgeData.security.dataProtection },
          auditLogging: { ...defaults.security!.auditLogging, ...edgeData.security.auditLogging },
        }
      : defaults.security,

    versioning: edgeData.versioning
      ? { ...defaults.versioning, ...edgeData.versioning }
      : defaults.versioning,

    streaming: edgeData.streaming
      ? { ...defaults.streaming, ...edgeData.streaming }
      : defaults.streaming,

    eventDriven: edgeData.eventDriven
      ? { ...defaults.eventDriven, ...edgeData.eventDriven }
      : defaults.eventDriven,

    costTracking: edgeData.costTracking
      ? { ...defaults.costTracking, ...edgeData.costTracking }
      : defaults.costTracking,

    performance: edgeData.performance
      ? {
          caching: { ...defaults.performance!.caching, ...edgeData.performance.caching },
          prefetchEnabled: edgeData.performance.prefetchEnabled ?? defaults.performance!.prefetchEnabled,
        }
      : defaults.performance,

    sla: edgeData.sla
      ? { ...defaults.sla, ...edgeData.sla }
      : defaults.sla,

    advancedRouting: edgeData.advancedRouting
      ? {
          ...defaults.advancedRouting,
          ...edgeData.advancedRouting,
          loadBalancing: edgeData.advancedRouting.loadBalancing
            ? edgeData.advancedRouting.loadBalancing
            : undefined,
        }
      : defaults.advancedRouting,
  };
}

/**
 * Type guard to check if retry policy is configured
 */
export function hasRetryPolicy(edgeData: Partial<WorkflowEdgeData>): boolean {
  return !!edgeData.retryPolicy && (edgeData.retryPolicy.maxAttempts ?? 0) > 0;
}

/**
 * Type guard to check if circuit breaker is enabled
 */
export function hasCircuitBreaker(edgeData: Partial<WorkflowEdgeData>): boolean {
  return !!edgeData.circuitBreaker && edgeData.circuitBreaker.enabled === true;
}

/**
 * Type guard to check if observability is enabled
 */
export function hasObservability(edgeData: Partial<WorkflowEdgeData>): boolean {
  return (
    !!edgeData.observability &&
    (edgeData.observability.traceContext?.enabled === true ||
      edgeData.observability.logging?.enabled === true ||
      edgeData.observability.metrics?.enabled === true)
  );
}

/**
 * Type guard to check if security features are enabled
 */
export function hasSecurityFeatures(edgeData: Partial<WorkflowEdgeData>): boolean {
  return (
    !!edgeData.security &&
    (edgeData.security.accessControl?.authenticationRequired === true ||
      edgeData.security.dataProtection?.encryptInTransit === true ||
      edgeData.security.dataProtection?.piiRedaction === true ||
      edgeData.security.auditLogging?.enabled === true)
  );
}

/**
 * Get a minimal edge data object (no defaults applied)
 * Used for creating new edges
 */
export function getMinimalEdgeData(label?: string, condition?: string): Partial<WorkflowEdgeData> {
  return {
    label,
    condition,
    // Apply only critical defaults for production reliability
    ...getDefaultEdgeProperties(),
  };
}
