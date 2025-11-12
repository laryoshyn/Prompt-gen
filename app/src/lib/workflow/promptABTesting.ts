/**
 * Agent Prompt A/B Testing Framework
 * Compare different prompt variants with systematic testing
 *
 * Features:
 * - Side-by-side prompt comparison
 * - Statistical significance testing
 * - Metric-based evaluation
 * - Winner selection
 * - Test case management
 */

import type { WorkflowNode } from '@/types/workflow';

/**
 * Prompt variant
 */
export interface PromptVariant {
  id: string;
  name: string;
  promptTemplate: string;
  description?: string;

  // Metadata
  createdAt: number;
  createdBy?: string;
  tags?: string[];
}

/**
 * Test case for A/B testing
 */
export interface ABTestCase {
  id: string;
  input: unknown;
  expectedOutput?: unknown;
  context?: Record<string, unknown>;
  weight?: number; // For weighted averaging
}

/**
 * Single variant result
 */
export interface VariantResult {
  variantId: string;
  testCaseId: string;

  // Execution
  output: unknown;
  executionTimeMs: number;
  tokensUsed: number;
  cost: number;

  // Quality metrics
  metrics: Record<string, number>;
  passed: boolean;

  // Errors
  error?: string;

  timestamp: number;
}

/**
 * A/B test configuration
 */
export interface ABTestConfig {
  id: string;
  name: string;
  description?: string;

  // Node being tested
  nodeId: string;
  nodeName: string;

  // Variants
  variants: PromptVariant[];
  controlVariantId: string; // Baseline variant

  // Test cases
  testCases: ABTestCase[];

  // Evaluation
  primaryMetric: string; // Main metric for comparison
  metrics: Array<{
    name: string;
    type: 'accuracy' | 'quality' | 'performance' | 'cost' | 'custom';
    higherIsBetter: boolean;
    weight?: number;
  }>;

  // Statistical
  confidenceLevel: number; // e.g., 0.95 for 95%
  minSampleSize: number;

  // Status
  status: 'draft' | 'running' | 'completed' | 'cancelled';
  startedAt?: number;
  completedAt?: number;

  createdAt: number;
}

/**
 * A/B test results
 */
export interface ABTestResult {
  testId: string;

  // Variant performance
  variantStats: Record<string, {
    variantId: string;
    variantName: string;

    // Aggregated metrics
    metrics: Record<string, {
      mean: number;
      median: number;
      stdDev: number;
      min: number;
      max: number;
    }>;

    // Performance
    avgExecutionTime: number;
    avgTokensUsed: number;
    avgCost: number;

    // Quality
    passRate: number; // % of tests passed
    totalTests: number;
    passedTests: number;
    failedTests: number;
  }>;

  // Comparison
  winner?: {
    variantId: string;
    variantName: string;
    confidenceLevel: number;
    improvement: number; // % improvement over control
    significantDifference: boolean;
  };

  // Detailed results
  results: VariantResult[];

  // Recommendations
  recommendations: string[];

  completedAt: number;
}

/**
 * Statistical comparison result
 */
export interface StatisticalComparison {
  variantA: string;
  variantB: string;
  metric: string;

  // T-test results
  tStatistic: number;
  pValue: number;
  significantDifference: boolean;
  confidenceLevel: number;

  // Effect size
  cohensD: number;
  effectSize: 'small' | 'medium' | 'large';

  // Means
  meanA: number;
  meanB: number;
  difference: number;
  percentDifference: number;
}

/**
 * Prompt A/B Testing Manager
 */
export class PromptABTestingManager {
  private tests: Map<string, ABTestConfig>;
  private results: Map<string, ABTestResult>;
  private variants: Map<string, PromptVariant>;

  constructor() {
    this.tests = new Map();
    this.results = new Map();
    this.variants = new Map();
  }

  /**
   * Create prompt variant
   */
  createVariant(params: {
    name: string;
    promptTemplate: string;
    description?: string;
    tags?: string[];
  }): PromptVariant {
    const variant: PromptVariant = {
      id: `variant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: params.name,
      promptTemplate: params.promptTemplate,
      description: params.description,
      tags: params.tags,
      createdAt: Date.now(),
    };

    this.variants.set(variant.id, variant);
    return variant;
  }

  /**
   * Create A/B test
   */
  createABTest(params: {
    name: string;
    description?: string;
    nodeId: string;
    nodeName: string;
    variants: PromptVariant[];
    controlVariantId: string;
    testCases: ABTestCase[];
    primaryMetric: string;
    metrics: ABTestConfig['metrics'];
    confidenceLevel?: number;
    minSampleSize?: number;
  }): ABTestConfig {
    const test: ABTestConfig = {
      id: `abtest-${Date.now()}`,
      name: params.name,
      description: params.description,
      nodeId: params.nodeId,
      nodeName: params.nodeName,
      variants: params.variants,
      controlVariantId: params.controlVariantId,
      testCases: params.testCases,
      primaryMetric: params.primaryMetric,
      metrics: params.metrics,
      confidenceLevel: params.confidenceLevel || 0.95,
      minSampleSize: params.minSampleSize || 30,
      status: 'draft',
      createdAt: Date.now(),
    };

    this.tests.set(test.id, test);
    return test;
  }

  /**
   * Run A/B test
   */
  async runABTest(
    testId: string,
    executor: (variantId: string, testCase: ABTestCase) => Promise<{
      output: unknown;
      executionTimeMs: number;
      tokensUsed: number;
      metrics: Record<string, number>;
      passed: boolean;
      error?: string;
    }>
  ): Promise<ABTestResult> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    test.status = 'running';
    test.startedAt = Date.now();

    const results: VariantResult[] = [];

    // Run each variant against all test cases
    for (const variant of test.variants) {
      for (const testCase of test.testCases) {
        try {
          const result = await executor(variant.id, testCase);

          const variantResult: VariantResult = {
            variantId: variant.id,
            testCaseId: testCase.id,
            output: result.output,
            executionTimeMs: result.executionTimeMs,
            tokensUsed: result.tokensUsed,
            cost: result.tokensUsed * 0.000015, // Claude Sonnet pricing
            metrics: result.metrics,
            passed: result.passed,
            error: result.error,
            timestamp: Date.now(),
          };

          results.push(variantResult);
        } catch (error) {
          // Record error result
          results.push({
            variantId: variant.id,
            testCaseId: testCase.id,
            output: null,
            executionTimeMs: 0,
            tokensUsed: 0,
            cost: 0,
            metrics: {},
            passed: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now(),
          });
        }
      }
    }

    // Analyze results
    const testResult = this.analyzeResults(test, results);

    test.status = 'completed';
    test.completedAt = Date.now();

    this.results.set(testId, testResult);
    return testResult;
  }

  /**
   * Analyze test results
   */
  private analyzeResults(test: ABTestConfig, results: VariantResult[]): ABTestResult {
    // Calculate statistics for each variant
    const variantStats: ABTestResult['variantStats'] = {};

    for (const variant of test.variants) {
      const variantResults = results.filter(r => r.variantId === variant.id);

      if (variantResults.length === 0) {
        continue;
      }

      // Calculate metrics statistics
      const metricsStats: Record<string, any> = {};

      for (const metric of test.metrics) {
        const values = variantResults
          .map(r => r.metrics[metric.name])
          .filter(v => v !== undefined && !isNaN(v));

        if (values.length > 0) {
          metricsStats[metric.name] = {
            mean: this.mean(values),
            median: this.median(values),
            stdDev: this.stdDev(values),
            min: Math.min(...values),
            max: Math.max(...values),
          };
        }
      }

      variantStats[variant.id] = {
        variantId: variant.id,
        variantName: variant.name,
        metrics: metricsStats,
        avgExecutionTime: this.mean(variantResults.map(r => r.executionTimeMs)),
        avgTokensUsed: this.mean(variantResults.map(r => r.tokensUsed)),
        avgCost: this.mean(variantResults.map(r => r.cost)),
        passRate: (variantResults.filter(r => r.passed).length / variantResults.length) * 100,
        totalTests: variantResults.length,
        passedTests: variantResults.filter(r => r.passed).length,
        failedTests: variantResults.filter(r => !r.passed).length,
      };
    }

    // Determine winner
    const winner = this.determineWinner(test, variantStats);

    // Generate recommendations
    const recommendations = this.generateRecommendations(test, variantStats, winner);

    return {
      testId: test.id,
      variantStats,
      winner,
      results,
      recommendations,
      completedAt: Date.now(),
    };
  }

  /**
   * Determine winner
   */
  private determineWinner(
    test: ABTestConfig,
    variantStats: ABTestResult['variantStats']
  ): ABTestResult['winner'] {
    const primaryMetric = test.primaryMetric;
    const metric = test.metrics.find(m => m.name === primaryMetric);

    if (!metric) {
      return undefined;
    }

    const controlStats = variantStats[test.controlVariantId];
    if (!controlStats) {
      return undefined;
    }

    const controlValue = controlStats.metrics[primaryMetric]?.mean;
    if (controlValue === undefined) {
      return undefined;
    }

    // Find best variant (excluding control)
    let bestVariant: { id: string; name: string; value: number } | null = null;

    for (const [variantId, stats] of Object.entries(variantStats)) {
      if (variantId === test.controlVariantId) continue;

      const value = stats.metrics[primaryMetric]?.mean;
      if (value === undefined) continue;

      if (!bestVariant) {
        bestVariant = { id: variantId, name: stats.variantName, value };
      } else {
        const isBetter = metric.higherIsBetter
          ? value > bestVariant.value
          : value < bestVariant.value;

        if (isBetter) {
          bestVariant = { id: variantId, name: stats.variantName, value };
        }
      }
    }

    if (!bestVariant) {
      return undefined;
    }

    // Calculate improvement
    const improvement = metric.higherIsBetter
      ? ((bestVariant.value - controlValue) / controlValue) * 100
      : ((controlValue - bestVariant.value) / controlValue) * 100;

    // Simple significance test (would use proper t-test in production)
    const significantDifference = Math.abs(improvement) > 5; // 5% threshold

    return {
      variantId: bestVariant.id,
      variantName: bestVariant.name,
      confidenceLevel: test.confidenceLevel,
      improvement,
      significantDifference,
    };
  }

  /**
   * Compare two variants statistically
   */
  compareVariants(
    testId: string,
    variantAId: string,
    variantBId: string,
    metric: string
  ): StatisticalComparison | null {
    const result = this.results.get(testId);
    if (!result) return null;

    const resultsA = result.results.filter(r => r.variantId === variantAId);
    const resultsB = result.results.filter(r => r.variantId === variantBId);

    if (resultsA.length === 0 || resultsB.length === 0) return null;

    const valuesA = resultsA.map(r => r.metrics[metric]).filter(v => v !== undefined);
    const valuesB = resultsB.map(r => r.metrics[metric]).filter(v => v !== undefined);

    if (valuesA.length === 0 || valuesB.length === 0) return null;

    // Calculate statistics
    const meanA = this.mean(valuesA);
    const meanB = this.mean(valuesB);
    const stdDevA = this.stdDev(valuesA);
    const stdDevB = this.stdDev(valuesB);

    // T-statistic (simplified - would use proper library in production)
    const pooledStdDev = Math.sqrt(
      ((valuesA.length - 1) * stdDevA ** 2 + (valuesB.length - 1) * stdDevB ** 2) /
        (valuesA.length + valuesB.length - 2)
    );

    const tStatistic =
      (meanA - meanB) / (pooledStdDev * Math.sqrt(1 / valuesA.length + 1 / valuesB.length));

    // Simplified p-value (would use proper t-distribution in production)
    const pValue = Math.min(1, Math.abs(tStatistic) / 3); // Very rough approximation

    // Cohen's D (effect size)
    const cohensD = (meanA - meanB) / pooledStdDev;
    const effectSize =
      Math.abs(cohensD) < 0.5 ? 'small' : Math.abs(cohensD) < 0.8 ? 'medium' : 'large';

    return {
      variantA: variantAId,
      variantB: variantBId,
      metric,
      tStatistic,
      pValue,
      significantDifference: pValue < 0.05,
      confidenceLevel: 0.95,
      cohensD,
      effectSize,
      meanA,
      meanB,
      difference: meanA - meanB,
      percentDifference: ((meanA - meanB) / meanB) * 100,
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    test: ABTestConfig,
    variantStats: ABTestResult['variantStats'],
    winner: ABTestResult['winner']
  ): string[] {
    const recommendations: string[] = [];

    if (winner) {
      if (winner.significantDifference) {
        recommendations.push(
          `✅ Recommend using "${winner.variantName}" - shows ${winner.improvement.toFixed(1)}% improvement over control`
        );
      } else {
        recommendations.push(
          `⚠️ "${winner.variantName}" performs better, but difference is not statistically significant`
        );
      }
    } else {
      recommendations.push('No clear winner detected - variants perform similarly');
    }

    // Check pass rates
    for (const [variantId, stats] of Object.entries(variantStats)) {
      if (stats.passRate < 50) {
        recommendations.push(
          `⚠️ "${stats.variantName}" has low pass rate (${stats.passRate.toFixed(1)}%) - consider revising`
        );
      }
    }

    // Check costs
    const costs = Object.values(variantStats).map(s => s.avgCost);
    const maxCost = Math.max(...costs);
    const minCost = Math.min(...costs);

    if (maxCost > minCost * 2) {
      const expensiveVariant = Object.values(variantStats).find(s => s.avgCost === maxCost);
      recommendations.push(
        `💰 "${expensiveVariant?.variantName}" is 2x more expensive - consider cost/benefit tradeoff`
      );
    }

    // Check sample size
    const sampleSize = Object.values(variantStats)[0]?.totalTests || 0;
    if (sampleSize < test.minSampleSize) {
      recommendations.push(
        `📊 Sample size (${sampleSize}) is below minimum (${test.minSampleSize}) - results may not be reliable`
      );
    }

    return recommendations;
  }

  /**
   * Get A/B test
   */
  getABTest(testId: string): ABTestConfig | null {
    return this.tests.get(testId) || null;
  }

  /**
   * Get test result
   */
  getTestResult(testId: string): ABTestResult | null {
    return this.results.get(testId) || null;
  }

  /**
   * Get variant
   */
  getVariant(variantId: string): PromptVariant | null {
    return this.variants.get(variantId) || null;
  }

  /**
   * List tests for node
   */
  getTestsForNode(nodeId: string): ABTestConfig[] {
    return Array.from(this.tests.values()).filter(t => t.nodeId === nodeId);
  }

  // ===== STATISTICAL HELPERS =====

  private mean(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private stdDev(values: number[]): number {
    const avg = this.mean(values);
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    const avgSquareDiff = this.mean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }
}

/**
 * Singleton instance
 */
export const promptABTestingManager = new PromptABTestingManager();

/**
 * Common test case templates
 */
export const TEST_CASE_TEMPLATES = {
  /**
   * Simple input/output test
   */
  SIMPLE: {
    name: 'Simple Test Case',
    template: {
      input: 'Sample input',
      expectedOutput: 'Expected output',
      context: {},
    },
  },

  /**
   * Quality test with multiple criteria
   */
  QUALITY: {
    name: 'Quality Assessment',
    template: {
      input: 'Complex input requiring quality assessment',
      context: {
        criteria: ['accuracy', 'completeness', 'clarity'],
      },
    },
  },

  /**
   * Edge case test
   */
  EDGE_CASE: {
    name: 'Edge Case',
    template: {
      input: 'Unusual or boundary condition input',
      context: {
        expectRobustHandling: true,
      },
    },
  },
};
