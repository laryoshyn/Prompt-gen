import type { WorkflowEdgeData, WorkflowNode } from '@/types/workflow';

/**
 * Edge validation result
 */
export interface EdgeValidationResult {
  isValid: boolean;
  errors: EdgeValidationError[];
  warnings: EdgeValidationWarning[];
}

export interface EdgeValidationError {
  property: string;
  message: string;
  severity: 'error';
}

export interface EdgeValidationWarning {
  property: string;
  message: string;
  severity: 'warning';
}

/**
 * Comprehensive edge property validator
 * Based on 2024-2025 industry best practices
 */
export function validateEdgeData(
  edgeData: Partial<WorkflowEdgeData>,
  nodes: WorkflowNode[] = []
): EdgeValidationResult {
  const errors: EdgeValidationError[] = [];
  const warnings: EdgeValidationWarning[] = [];

  // ========== TIER 1: CRITICAL VALIDATIONS ==========

  // Retry Policy Validation
  if (edgeData.retryPolicy) {
    const { maxAttempts, backoffCoefficient, initialIntervalMs, maxIntervalMs } = edgeData.retryPolicy;

    if (maxAttempts !== undefined) {
      if (maxAttempts < 0) {
        errors.push({
          property: 'retryPolicy.maxAttempts',
          message: 'Max attempts must be a non-negative number',
          severity: 'error',
        });
      } else if (maxAttempts > 10) {
        warnings.push({
          property: 'retryPolicy.maxAttempts',
          message: 'Max attempts > 10 may cause long delays. Consider using circuit breaker instead.',
          severity: 'warning',
        });
      }
    }

    if (backoffCoefficient !== undefined && backoffCoefficient < 1) {
      errors.push({
        property: 'retryPolicy.backoffCoefficient',
        message: 'Backoff coefficient must be >= 1.0',
        severity: 'error',
      });
    }

    if (initialIntervalMs !== undefined && initialIntervalMs < 0) {
      errors.push({
        property: 'retryPolicy.initialIntervalMs',
        message: 'Initial interval must be a positive number',
        severity: 'error',
      });
    }

    if (maxIntervalMs !== undefined && maxIntervalMs < 0) {
      errors.push({
        property: 'retryPolicy.maxIntervalMs',
        message: 'Max interval must be a positive number',
        severity: 'error',
      });
    }

    if (
      initialIntervalMs !== undefined &&
      maxIntervalMs !== undefined &&
      initialIntervalMs > maxIntervalMs
    ) {
      errors.push({
        property: 'retryPolicy',
        message: 'Initial interval must be less than or equal to max interval',
        severity: 'error',
      });
    }
  }

  // Circuit Breaker Validation
  if (edgeData.circuitBreaker) {
    const { failureThreshold, halfOpenTimeoutMs, successThreshold } = edgeData.circuitBreaker;

    if (failureThreshold !== undefined) {
      if (failureThreshold < 0 || failureThreshold > 1) {
        errors.push({
          property: 'circuitBreaker.failureThreshold',
          message: 'Failure threshold must be between 0.0 and 1.0',
          severity: 'error',
        });
      }
    }

    if (halfOpenTimeoutMs !== undefined && halfOpenTimeoutMs < 0) {
      errors.push({
        property: 'circuitBreaker.halfOpenTimeoutMs',
        message: 'Half-open timeout must be a positive number',
        severity: 'error',
      });
    }

    if (successThreshold !== undefined && successThreshold < 1) {
      errors.push({
        property: 'circuitBreaker.successThreshold',
        message: 'Success threshold must be at least 1',
        severity: 'error',
      });
    }
  }

  // Fallback Validation
  if (edgeData.fallback?.enabled && edgeData.fallback.strategy === 'alternative-agent') {
    if (!edgeData.fallback.fallbackEdgeId) {
      errors.push({
        property: 'fallback.fallbackEdgeId',
        message: 'Fallback edge ID is required when using alternative-agent strategy',
        severity: 'error',
      });
    }
  }

  if (edgeData.fallback?.enabled && edgeData.fallback.strategy === 'default-value') {
    if (edgeData.fallback.fallbackValue === undefined) {
      warnings.push({
        property: 'fallback.fallbackValue',
        message: 'Consider providing a fallback value for default-value strategy',
        severity: 'warning',
      });
    }
  }

  // Timeout Validation
  if (edgeData.timeout) {
    const { executionTimeoutMs, responseTimeoutMs, totalTimeoutMs } = edgeData.timeout;

    if (executionTimeoutMs !== undefined && executionTimeoutMs < 0) {
      errors.push({
        property: 'timeout.executionTimeoutMs',
        message: 'Execution timeout must be a positive number',
        severity: 'error',
      });
    }

    if (responseTimeoutMs !== undefined && responseTimeoutMs < 0) {
      errors.push({
        property: 'timeout.responseTimeoutMs',
        message: 'Response timeout must be a positive number',
        severity: 'error',
      });
    }

    if (totalTimeoutMs !== undefined && totalTimeoutMs < 0) {
      errors.push({
        property: 'timeout.totalTimeoutMs',
        message: 'Total timeout must be a positive number',
        severity: 'error',
      });
    }

    // Validate timeout relationships
    if (
      responseTimeoutMs !== undefined &&
      executionTimeoutMs !== undefined &&
      responseTimeoutMs > executionTimeoutMs
    ) {
      errors.push({
        property: 'timeout',
        message: 'Response timeout must be less than or equal to execution timeout',
        severity: 'error',
      });
    }

    if (
      executionTimeoutMs !== undefined &&
      totalTimeoutMs !== undefined &&
      executionTimeoutMs > totalTimeoutMs
    ) {
      warnings.push({
        property: 'timeout',
        message: 'Execution timeout is greater than total timeout. Total timeout should account for retries.',
        severity: 'warning',
      });
    }
  }

  // Observability Validation
  if (edgeData.observability?.traceContext?.samplingRate !== undefined) {
    const samplingRate = edgeData.observability.traceContext.samplingRate;
    if (samplingRate < 0 || samplingRate > 1) {
      errors.push({
        property: 'observability.traceContext.samplingRate',
        message: 'Sampling rate must be between 0.0 and 1.0',
        severity: 'error',
      });
    }
  }

  // ========== TIER 2: IMPORTANT VALIDATIONS ==========

  // Rate Limiting Validation
  if (edgeData.rateLimiting?.enabled) {
    const { requestsPerSecond, burstCapacity } = edgeData.rateLimiting;

    if (requestsPerSecond !== undefined && requestsPerSecond <= 0) {
      errors.push({
        property: 'rateLimiting.requestsPerSecond',
        message: 'Requests per second must be a positive number',
        severity: 'error',
      });
    }

    if (burstCapacity !== undefined && burstCapacity <= 0) {
      errors.push({
        property: 'rateLimiting.burstCapacity',
        message: 'Burst capacity must be a positive number',
        severity: 'error',
      });
    }

    if (
      requestsPerSecond !== undefined &&
      burstCapacity !== undefined &&
      burstCapacity < requestsPerSecond
    ) {
      warnings.push({
        property: 'rateLimiting',
        message: 'Burst capacity should typically be greater than requests per second',
        severity: 'warning',
      });
    }
  }

  // Resource Limits Validation
  if (edgeData.resourceLimits) {
    const { maxConcurrentTraversals, maxMemoryMb, maxTokens } = edgeData.resourceLimits;

    if (maxConcurrentTraversals !== undefined && maxConcurrentTraversals <= 0) {
      errors.push({
        property: 'resourceLimits.maxConcurrentTraversals',
        message: 'Max concurrent traversals must be a positive number',
        severity: 'error',
      });
    }

    if (maxMemoryMb !== undefined && maxMemoryMb <= 0) {
      errors.push({
        property: 'resourceLimits.maxMemoryMb',
        message: 'Max memory must be a positive number',
        severity: 'error',
      });
    }

    if (maxTokens !== undefined && maxTokens <= 0) {
      errors.push({
        property: 'resourceLimits.maxTokens',
        message: 'Max tokens must be a positive number',
        severity: 'error',
      });
    }
  }

  // Security Validation
  if (edgeData.security?.accessControl) {
    const { allowedSourceAgents, allowedTargetAgents } = edgeData.security.accessControl;

    // Validate that referenced agents exist in the workflow
    if (allowedSourceAgents && allowedSourceAgents.length > 0 && nodes.length > 0) {
      const nodeIds = new Set(nodes.map((n) => n.id));
      const invalidSourceAgents = allowedSourceAgents.filter((id) => !nodeIds.has(id));
      if (invalidSourceAgents.length > 0) {
        errors.push({
          property: 'security.accessControl.allowedSourceAgents',
          message: `Invalid agent IDs: ${invalidSourceAgents.join(', ')}`,
          severity: 'error',
        });
      }
    }

    if (allowedTargetAgents && allowedTargetAgents.length > 0 && nodes.length > 0) {
      const nodeIds = new Set(nodes.map((n) => n.id));
      const invalidTargetAgents = allowedTargetAgents.filter((id) => !nodeIds.has(id));
      if (invalidTargetAgents.length > 0) {
        errors.push({
          property: 'security.accessControl.allowedTargetAgents',
          message: `Invalid agent IDs: ${invalidTargetAgents.join(', ')}`,
          severity: 'error',
        });
      }
    }
  }

  if (edgeData.security?.dataProtection?.dataRetentionDays !== undefined) {
    if (edgeData.security.dataProtection.dataRetentionDays < 0) {
      errors.push({
        property: 'security.dataProtection.dataRetentionDays',
        message: 'Data retention days must be a non-negative number',
        severity: 'error',
      });
    }
  }

  // Schema Validation
  if (edgeData.communication?.schemaValidation?.enabled) {
    if (!edgeData.communication.schemaValidation.schemaId) {
      errors.push({
        property: 'communication.schemaValidation.schemaId',
        message: 'Schema ID is required when schema validation is enabled',
        severity: 'error',
      });
    }
  }

  // ========== TIER 3: NICE-TO-HAVE VALIDATIONS ==========

  // Versioning Validation
  if (edgeData.versioning?.edgeVersion) {
    // Validate semantic versioning format (basic check)
    const semverPattern = /^\d+\.\d+\.\d+$/;
    if (!semverPattern.test(edgeData.versioning.edgeVersion)) {
      warnings.push({
        property: 'versioning.edgeVersion',
        message: 'Edge version should follow semantic versioning format (e.g., 1.2.3)',
        severity: 'warning',
      });
    }
  }

  // Experiment Validation
  if (edgeData.experiment?.trafficAllocation !== undefined) {
    const allocation = edgeData.experiment.trafficAllocation;
    if (allocation < 0 || allocation > 1) {
      errors.push({
        property: 'experiment.trafficAllocation',
        message: 'Traffic allocation must be between 0.0 and 1.0',
        severity: 'error',
      });
    }
  }

  // Streaming Validation
  if (edgeData.streaming?.enabled) {
    if (edgeData.streaming.chunkSize !== undefined && edgeData.streaming.chunkSize <= 0) {
      errors.push({
        property: 'streaming.chunkSize',
        message: 'Chunk size must be a positive number',
        severity: 'error',
      });
    }

    if (edgeData.streaming.bufferSize !== undefined && edgeData.streaming.bufferSize <= 0) {
      errors.push({
        property: 'streaming.bufferSize',
        message: 'Buffer size must be a positive number',
        severity: 'error',
      });
    }
  }

  // Cost Tracking Validation
  if (edgeData.costTracking?.enabled) {
    if (edgeData.costTracking.costPerTraversal !== undefined && edgeData.costTracking.costPerTraversal < 0) {
      errors.push({
        property: 'costTracking.costPerTraversal',
        message: 'Cost per traversal must be a non-negative number',
        severity: 'error',
      });
    }

    if (edgeData.costTracking.budgetLimit !== undefined && edgeData.costTracking.budgetLimit < 0) {
      errors.push({
        property: 'costTracking.budgetLimit',
        message: 'Budget limit must be a non-negative number',
        severity: 'error',
      });
    }
  }

  // Performance Validation
  if (edgeData.performance?.caching?.enabled) {
    if (edgeData.performance.caching.cacheTTL !== undefined && edgeData.performance.caching.cacheTTL <= 0) {
      errors.push({
        property: 'performance.caching.cacheTTL',
        message: 'Cache TTL must be a positive number',
        severity: 'error',
      });
    }
  }

  // SLA Validation
  if (edgeData.sla) {
    if (edgeData.sla.maxLatencyMs !== undefined && edgeData.sla.maxLatencyMs <= 0) {
      errors.push({
        property: 'sla.maxLatencyMs',
        message: 'Max latency must be a positive number',
        severity: 'error',
      });
    }

    if (edgeData.sla.minAvailability !== undefined) {
      if (edgeData.sla.minAvailability < 0 || edgeData.sla.minAvailability > 1) {
        errors.push({
          property: 'sla.minAvailability',
          message: 'Min availability must be between 0.0 and 1.0',
          severity: 'error',
        });
      }
    }

    if (edgeData.sla.maxErrorRate !== undefined) {
      if (edgeData.sla.maxErrorRate < 0 || edgeData.sla.maxErrorRate > 1) {
        errors.push({
          property: 'sla.maxErrorRate',
          message: 'Max error rate must be between 0.0 and 1.0',
          severity: 'error',
        });
      }
    }
  }

  // Advanced Routing Validation
  if (edgeData.advancedRouting?.loadBalancing) {
    const weights = edgeData.advancedRouting.loadBalancing.weights;
    if (weights && nodes.length > 0) {
      const nodeIds = new Set(nodes.map((n) => n.id));
      const invalidAgents = Object.keys(weights).filter((id) => !nodeIds.has(id));
      if (invalidAgents.length > 0) {
        errors.push({
          property: 'advancedRouting.loadBalancing.weights',
          message: `Invalid agent IDs in weights: ${invalidAgents.join(', ')}`,
          severity: 'error',
        });
      }

      // Validate weight values
      const invalidWeights = Object.entries(weights).filter(([, weight]) => weight < 0);
      if (invalidWeights.length > 0) {
        errors.push({
          property: 'advancedRouting.loadBalancing.weights',
          message: 'Weights must be non-negative numbers',
          severity: 'error',
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Quick validation for UI (synchronous, no node references)
 */
export function quickValidate(edgeData: Partial<WorkflowEdgeData>): { isValid: boolean; errorCount: number } {
  const result = validateEdgeData(edgeData);
  return {
    isValid: result.isValid,
    errorCount: result.errors.length,
  };
}

/**
 * Get validation summary as a human-readable string
 */
export function getValidationSummary(result: EdgeValidationResult): string {
  if (result.isValid && result.warnings.length === 0) {
    return '✅ Edge configuration is valid';
  }

  const parts: string[] = [];

  if (result.errors.length > 0) {
    parts.push(`❌ ${result.errors.length} error(s)`);
  }

  if (result.warnings.length > 0) {
    parts.push(`⚠️ ${result.warnings.length} warning(s)`);
  }

  return parts.join(', ');
}
