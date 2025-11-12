/**
 * Evaluation Framework Integration
 * Based on GOLDEN framework from PROMPT-GENERATION-GUIDE.md
 *
 * GOLDEN: Goal-Oriented Learning with Diverse Example-based evaluation
 * - Define measurable success criteria
 * - Test with diverse inputs (edge cases, malformed data, adversarial)
 * - A/B testing for prompt variants
 * - Systematic measurement over "prompt and pray"
 */

import type { WorkflowState } from '@/types/workflow';
import type { VersionedArtifact } from './artifactVersioning';

/**
 * Evaluation metric types
 */
export type MetricType =
  | 'accuracy' // Correctness of output
  | 'completeness' // All requirements met
  | 'quality' // Subjective quality score
  | 'performance' // Speed/efficiency
  | 'cost' // Token usage/API cost
  | 'robustness' // Handles edge cases
  | 'consistency' // Similar inputs → similar outputs
  | 'adherence' // Follows constraints/format
  | 'custom'; // User-defined metric

/**
 * Evaluation metric definition
 */
export interface EvaluationMetric {
  id: string;
  name: string;
  type: MetricType;
  description: string;

  // Measurement method
  method: 'automated' | 'llm-judge' | 'human' | 'hybrid';

  // For automated metrics
  automatedCheck?: {
    type: 'regex' | 'schema' | 'function';
    pattern?: string; // For regex
    schema?: object; // For schema validation
    evaluator?: (output: unknown, context: EvaluationContext) => number; // For custom function
  };

  // For LLM-judge metrics
  llmJudgePrompt?: string; // Prompt for LLM to evaluate output

  // Scoring
  scoreRange: { min: number; max: number }; // e.g., 0-1, 0-10, 0-100
  passingThreshold?: number; // Minimum score to pass

  // Weight in overall evaluation
  weight: number; // 0-1, sum of all weights should be 1

  // Critical flag
  critical?: boolean; // If false, workflow fails
}

/**
 * Test case for evaluation
 */
export interface TestCase {
  id: string;
  name: string;
  description?: string;

  // Input
  input: unknown; // Input to the agent/workflow
  inputType: 'normal' | 'edge-case' | 'malformed' | 'adversarial';

  // Expected output (if known)
  expectedOutput?: unknown;
  expectedOutputPattern?: string; // Regex pattern

  // Evaluation criteria
  metrics: string[]; // Metric IDs to evaluate

  // Metadata
  tags?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Test suite
 */
export interface TestSuite {
  id: string;
  name: string;
  description?: string;

  // Target
  targetType: 'workflow' | 'agent' | 'artifact';
  targetId: string; // Workflow/Agent/Artifact ID

  // Test cases
  testCases: TestCase[];

  // Metrics to evaluate
  metrics: EvaluationMetric[];

  // Coverage requirements
  minCoverage?: {
    normal: number; // % of normal cases
    edgeCase: number; // % of edge cases
    malformed: number; // % of malformed inputs
    adversarial: number; // % of adversarial inputs
  };

  // Metadata
  createdAt: number;
  updatedAt: number;
  version: string;
}

/**
 * Evaluation context
 */
export interface EvaluationContext {
  workflowState: WorkflowState;
  artifacts: Map<string, VersionedArtifact>;
  executionTime: number; // milliseconds
  tokenUsage?: number;
  cost?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Evaluation result for single metric
 */
export interface MetricResult {
  metricId: string;
  metricName: string;
  score: number;
  passed: boolean; // Score >= threshold
  reason?: string; // Why this score was given
  evaluatedAt: number;
  evaluationMethod: 'automated' | 'llm-judge' | 'human';
}

/**
 * Evaluation result for test case
 */
export interface TestCaseResult {
  testCaseId: string;
  testCaseName: string;

  // Overall result
  passed: boolean;
  score: number; // Weighted average of metric scores

  // Individual metrics
  metricResults: MetricResult[];

  // Output
  actualOutput: unknown;

  // Execution
  executionTime: number;
  tokenUsage?: number;
  error?: string;

  // Timestamps
  startedAt: number;
  completedAt: number;
}

/**
 * Test suite execution result
 */
export interface TestSuiteResult {
  suiteId: string;
  suiteName: string;

  // Overall results
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;

  // Scores
  overallScore: number; // 0-1
  metricScores: Record<string, number>; // metricId -> average score

  // Coverage
  coverage: {
    normal: number;
    edgeCase: number;
    malformed: number;
    adversarial: number;
  };

  // Individual test results
  testResults: TestCaseResult[];

  // Summary
  criticalFailures: string[]; // Test IDs that failed critical metrics
  recommendations: string[]; // Improvement suggestions

  // Execution
  totalExecutionTime: number;
  totalTokenUsage?: number;
  totalCost?: number;

  // Timestamps
  startedAt: number;
  completedAt: number;
}

/**
 * A/B Test configuration
 */
export interface ABTestConfig {
  id: string;
  name: string;
  description?: string;

  // Variants to test
  variants: Array<{
    id: string;
    name: string;
    promptTemplate: string; // Or workflow config
    description?: string;
  }>;

  // Test suite to run on each variant
  testSuiteId: string;

  // Success criteria
  primaryMetric: string; // Metric ID to optimize for
  secondaryMetrics?: string[]; // Additional metrics to track

  // Statistical parameters
  sampleSize?: number; // Number of test cases per variant
  confidenceLevel?: number; // e.g., 0.95 for 95% confidence

  // Status
  status: 'draft' | 'running' | 'completed' | 'cancelled';
  startedAt?: number;
  completedAt?: number;
}

/**
 * A/B Test result
 */
export interface ABTestResult {
  testId: string;
  testName: string;

  // Variant results
  variantResults: Array<{
    variantId: string;
    variantName: string;
    suiteResult: TestSuiteResult;
  }>;

  // Winner
  winner?: {
    variantId: string;
    variantName: string;
    confidenceLevel: number; // 0-1
    improvement: number; // % improvement over baseline
  };

  // Statistical analysis
  statisticalSignificance: boolean;
  pValue?: number;

  // Recommendations
  recommendation: string;
  insights: string[];

  // Timestamps
  completedAt: number;
}

/**
 * Evaluation Framework Manager
 */
export class EvaluationFrameworkManager {
  private testSuites: Map<string, TestSuite>;
  private testResults: Map<string, TestSuiteResult>; // suiteId -> latest result
  private abTests: Map<string, ABTestConfig>;
  private abTestResults: Map<string, ABTestResult>;

  constructor() {
    this.testSuites = new Map();
    this.testResults = new Map();
    this.abTests = new Map();
    this.abTestResults = new Map();
  }

  /**
   * Create test suite
   */
  createTestSuite(suite: Omit<TestSuite, 'id' | 'createdAt' | 'updatedAt'>): TestSuite {
    const testSuite: TestSuite = {
      ...suite,
      id: `suite-${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.testSuites.set(testSuite.id, testSuite);
    return testSuite;
  }

  /**
   * Add test case to suite
   */
  addTestCase(suiteId: string, testCase: Omit<TestCase, 'id'>): TestCase | null {
    const suite = this.testSuites.get(suiteId);
    if (!suite) return null;

    const newTestCase: TestCase = {
      ...testCase,
      id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    suite.testCases.push(newTestCase);
    suite.updatedAt = Date.now();

    return newTestCase;
  }

  /**
   * Run test suite
   */
  async runTestSuite(
    suiteId: string,
    executor: (testCase: TestCase) => Promise<{
      output: unknown;
      executionTime: number;
      tokenUsage?: number;
      error?: string;
    }>,
    context: EvaluationContext
  ): Promise<TestSuiteResult> {
    const suite = this.testSuites.get(suiteId);
    if (!suite) {
      throw new Error(`Test suite not found: ${suiteId}`);
    }

    const startTime = Date.now();
    const testResults: TestCaseResult[] = [];

    // Run each test case
    for (const testCase of suite.testCases) {
      const testStartTime = Date.now();

      try {
        // Execute test
        const execution = await executor(testCase);

        // Evaluate metrics
        const metricResults: MetricResult[] = [];
        for (const metricId of testCase.metrics) {
          const metric = suite.metrics.find(m => m.id === metricId);
          if (!metric) continue;

          const metricResult = await this.evaluateMetric(
            metric,
            execution.output,
            testCase.expectedOutput,
            { ...context, executionTime: execution.executionTime }
          );

          metricResults.push(metricResult);
        }

        // Calculate weighted score
        const totalWeight = metricResults.reduce((sum, mr) => {
          const metric = suite.metrics.find(m => m.id === mr.metricId);
          return sum + (metric?.weight || 0);
        }, 0);

        const weightedScore = metricResults.reduce((sum, mr) => {
          const metric = suite.metrics.find(m => m.id === mr.metricId);
          const weight = (metric?.weight || 0) / totalWeight;
          return sum + mr.score * weight;
        }, 0);

        // Check if passed
        const passed = metricResults.every(mr => mr.passed);

        testResults.push({
          testCaseId: testCase.id,
          testCaseName: testCase.name,
          passed,
          score: weightedScore,
          metricResults,
          actualOutput: execution.output,
          executionTime: execution.executionTime,
          tokenUsage: execution.tokenUsage,
          error: execution.error,
          startedAt: testStartTime,
          completedAt: Date.now(),
        });
      } catch (error) {
        // Test execution failed
        testResults.push({
          testCaseId: testCase.id,
          testCaseName: testCase.name,
          passed: false,
          score: 0,
          metricResults: [],
          actualOutput: null,
          executionTime: Date.now() - testStartTime,
          error: error instanceof Error ? error.message : 'Unknown error',
          startedAt: testStartTime,
          completedAt: Date.now(),
        });
      }
    }

    // Calculate overall results
    const totalTests = testResults.length;
    const passed = testResults.filter(r => r.passed).length;
    const failed = testResults.filter(r => !r.passed).length;
    const skipped = 0; // No skipped tests in this implementation

    // Calculate coverage
    const coverage = {
      normal: this.calculateCoverage(testResults, 'normal'),
      edgeCase: this.calculateCoverage(testResults, 'edge-case'),
      malformed: this.calculateCoverage(testResults, 'malformed'),
      adversarial: this.calculateCoverage(testResults, 'adversarial'),
    };

    // Calculate metric averages
    const metricScores: Record<string, number> = {};
    for (const metric of suite.metrics) {
      const metricResults = testResults.flatMap(tr =>
        tr.metricResults.filter(mr => mr.metricId === metric.id)
      );

      if (metricResults.length > 0) {
        metricScores[metric.id] = metricResults.reduce((sum, mr) => sum + mr.score, 0) / metricResults.length;
      }
    }

    // Overall score
    const overallScore = testResults.reduce((sum, tr) => sum + tr.score, 0) / totalTests;

    // Critical failures
    const criticalFailures = testResults
      .filter(tr => {
        return tr.metricResults.some(mr => {
          const metric = suite.metrics.find(m => m.id === mr.metricId);
          return metric?.critical && !mr.passed;
        });
      })
      .map(tr => tr.testCaseId);

    // Recommendations
    const recommendations = this.generateRecommendations(suite, testResults, metricScores);

    // Total execution time and costs
    const totalExecutionTime = Date.now() - startTime;
    const totalTokenUsage = testResults.reduce((sum, tr) => sum + (tr.tokenUsage || 0), 0);

    const result: TestSuiteResult = {
      suiteId,
      suiteName: suite.name,
      totalTests,
      passed,
      failed,
      skipped,
      overallScore,
      metricScores,
      coverage,
      testResults,
      criticalFailures,
      recommendations,
      totalExecutionTime,
      totalTokenUsage: totalTokenUsage > 0 ? totalTokenUsage : undefined,
      startedAt: startTime,
      completedAt: Date.now(),
    };

    // Store result
    this.testResults.set(suiteId, result);

    return result;
  }

  /**
   * Evaluate single metric
   */
  private async evaluateMetric(
    metric: EvaluationMetric,
    actualOutput: unknown,
    expectedOutput: unknown | undefined,
    context: EvaluationContext
  ): Promise<MetricResult> {
    const timestamp = Date.now();

    switch (metric.method) {
      case 'automated':
        return this.evaluateAutomated(metric, actualOutput, expectedOutput, context, timestamp);

      case 'llm-judge':
        return this.evaluateLLMJudge(metric, actualOutput, expectedOutput, context, timestamp);

      case 'human':
        // Human evaluation would require manual input
        return {
          metricId: metric.id,
          metricName: metric.name,
          score: 0,
          passed: false,
          reason: 'Human evaluation required',
          evaluatedAt: timestamp,
          evaluationMethod: 'human',
        };

      case 'hybrid':
        // Combine automated and LLM judge
        const autoResult = await this.evaluateAutomated(metric, actualOutput, expectedOutput, context, timestamp);
        const llmResult = await this.evaluateLLMJudge(metric, actualOutput, expectedOutput, context, timestamp);

        return {
          metricId: metric.id,
          metricName: metric.name,
          score: (autoResult.score + llmResult.score) / 2,
          passed: autoResult.passed && llmResult.passed,
          reason: `Automated: ${autoResult.reason}, LLM: ${llmResult.reason}`,
          evaluatedAt: timestamp,
          evaluationMethod: 'hybrid',
        };
    }
  }

  /**
   * Automated evaluation
   */
  private async evaluateAutomated(
    metric: EvaluationMetric,
    actualOutput: unknown,
    expectedOutput: unknown | undefined,
    context: EvaluationContext,
    timestamp: number
  ): Promise<MetricResult> {
    if (!metric.automatedCheck) {
      return {
        metricId: metric.id,
        metricName: metric.name,
        score: 0,
        passed: false,
        reason: 'No automated check configured',
        evaluatedAt: timestamp,
        evaluationMethod: 'automated',
      };
    }

    const { type } = metric.automatedCheck;

    try {
      let score = 0;
      let reason = '';

      if (type === 'regex' && metric.automatedCheck.pattern) {
        const pattern = new RegExp(metric.automatedCheck.pattern);
        const matches = pattern.test(String(actualOutput));
        score = matches ? metric.scoreRange.max : metric.scoreRange.min;
        reason = matches ? 'Output matches pattern' : 'Output does not match pattern';
      } else if (type === 'schema' && metric.automatedCheck.schema) {
        // Simple schema validation (in production, use Ajv or similar)
        const valid = this.validateSchema(actualOutput, metric.automatedCheck.schema);
        score = valid ? metric.scoreRange.max : metric.scoreRange.min;
        reason = valid ? 'Valid schema' : 'Invalid schema';
      } else if (type === 'function' && metric.automatedCheck.evaluator) {
        score = metric.automatedCheck.evaluator(actualOutput, context);
        reason = `Custom evaluator returned ${score}`;
      }

      const passed = metric.passingThreshold ? score >= metric.passingThreshold : true;

      return {
        metricId: metric.id,
        metricName: metric.name,
        score,
        passed,
        reason,
        evaluatedAt: timestamp,
        evaluationMethod: 'automated',
      };
    } catch (error) {
      return {
        metricId: metric.id,
        metricName: metric.name,
        score: 0,
        passed: false,
        reason: `Evaluation error: ${error instanceof Error ? error.message : 'Unknown'}`,
        evaluatedAt: timestamp,
        evaluationMethod: 'automated',
      };
    }
  }

  /**
   * LLM judge evaluation
   */
  private async evaluateLLMJudge(
    metric: EvaluationMetric,
    actualOutput: unknown,
    expectedOutput: unknown | undefined,
    context: EvaluationContext,
    timestamp: number
  ): Promise<MetricResult> {
    // In production, this would call an LLM API with the judge prompt
    // For now, return a placeholder
    return {
      metricId: metric.id,
      metricName: metric.name,
      score: metric.scoreRange.max / 2, // Placeholder: middle score
      passed: true,
      reason: 'LLM judge evaluation (placeholder)',
      evaluatedAt: timestamp,
      evaluationMethod: 'llm-judge',
    };
  }

  /**
   * Simple schema validation
   */
  private validateSchema(data: unknown, schema: object): boolean {
    // Simplified validation - in production, use Ajv
    try {
      return typeof data === 'object' && data !== null;
    } catch {
      return false;
    }
  }

  /**
   * Calculate coverage for test type
   */
  private calculateCoverage(results: TestCaseResult[], type: TestCase['inputType']): number {
    const totalOfType = results.filter(r => {
      // We'd need to look up the test case to get the type
      // For now, return simplified calculation
      return true;
    }).length;

    const passedOfType = results.filter(r => r.passed).length;

    return totalOfType > 0 ? (passedOfType / totalOfType) * 100 : 0;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    suite: TestSuite,
    results: TestCaseResult[],
    metricScores: Record<string, number>
  ): string[] {
    const recommendations: string[] = [];

    // Check overall pass rate
    const passRate = results.filter(r => r.passed).length / results.length;
    if (passRate < 0.7) {
      recommendations.push(`Low pass rate (${(passRate * 100).toFixed(1)}%). Review failing test cases.`);
    }

    // Check individual metrics
    for (const [metricId, score] of Object.entries(metricScores)) {
      const metric = suite.metrics.find(m => m.id === metricId);
      if (!metric) continue;

      const normalizedScore = (score - metric.scoreRange.min) / (metric.scoreRange.max - metric.scoreRange.min);

      if (normalizedScore < 0.7) {
        recommendations.push(`Improve ${metric.name} (current: ${(normalizedScore * 100).toFixed(1)}%)`);
      }
    }

    // Check test coverage diversity
    const testTypes = new Set(results.map(() => 'normal')); // Simplified
    if (testTypes.size < 3) {
      recommendations.push('Add more diverse test cases (edge cases, malformed inputs, adversarial)');
    }

    return recommendations;
  }

  /**
   * Create A/B test
   */
  createABTest(config: Omit<ABTestConfig, 'id' | 'status'>): ABTestConfig {
    const abTest: ABTestConfig = {
      ...config,
      id: `ab-${Date.now()}`,
      status: 'draft',
    };

    this.abTests.set(abTest.id, abTest);
    return abTest;
  }

  /**
   * Run A/B test
   */
  async runABTest(
    testId: string,
    executor: (variantId: string, testCase: TestCase) => Promise<{
      output: unknown;
      executionTime: number;
      tokenUsage?: number;
      error?: string;
    }>,
    context: EvaluationContext
  ): Promise<ABTestResult> {
    const abTest = this.abTests.get(testId);
    if (!abTest) {
      throw new Error(`A/B test not found: ${testId}`);
    }

    abTest.status = 'running';
    abTest.startedAt = Date.now();

    // Run test suite for each variant
    const variantResults: ABTestResult['variantResults'] = [];

    for (const variant of abTest.variants) {
      const suiteResult = await this.runTestSuite(
        abTest.testSuiteId,
        async (testCase) => executor(variant.id, testCase),
        context
      );

      variantResults.push({
        variantId: variant.id,
        variantName: variant.name,
        suiteResult,
      });
    }

    // Determine winner
    const primaryMetricScores = variantResults.map(vr => ({
      variantId: vr.variantId,
      variantName: vr.variantName,
      score: vr.suiteResult.metricScores[abTest.primaryMetric] || 0,
    }));

    primaryMetricScores.sort((a, b) => b.score - a.score);

    const winner = primaryMetricScores[0];
    const baseline = primaryMetricScores[primaryMetricScores.length - 1];
    const improvement = ((winner.score - baseline.score) / baseline.score) * 100;

    // Statistical significance (simplified)
    const statisticalSignificance = improvement > 5; // Simplified threshold

    const result: ABTestResult = {
      testId,
      testName: abTest.name,
      variantResults,
      winner: {
        variantId: winner.variantId,
        variantName: winner.variantName,
        confidenceLevel: 0.95, // Placeholder
        improvement,
      },
      statisticalSignificance,
      recommendation: statisticalSignificance
        ? `Use variant "${winner.variantName}" (${improvement.toFixed(1)}% improvement)`
        : 'No statistically significant difference between variants',
      insights: this.generateABTestInsights(variantResults, abTest),
      completedAt: Date.now(),
    };

    abTest.status = 'completed';
    abTest.completedAt = Date.now();

    this.abTestResults.set(testId, result);

    return result;
  }

  /**
   * Generate A/B test insights
   */
  private generateABTestInsights(
    variantResults: ABTestResult['variantResults'],
    config: ABTestConfig
  ): string[] {
    const insights: string[] = [];

    // Compare pass rates
    const passRates = variantResults.map(vr => ({
      name: vr.variantName,
      rate: vr.suiteResult.passed / vr.suiteResult.totalTests,
    }));

    passRates.sort((a, b) => b.rate - a.rate);
    insights.push(`Best pass rate: ${passRates[0].name} (${(passRates[0].rate * 100).toFixed(1)}%)`);

    // Compare execution times
    const execTimes = variantResults.map(vr => ({
      name: vr.variantName,
      time: vr.suiteResult.totalExecutionTime,
    }));

    execTimes.sort((a, b) => a.time - b.time);
    insights.push(`Fastest variant: ${execTimes[0].name} (${execTimes[0].time}ms total)`);

    return insights;
  }

  /**
   * Get test suite
   */
  getTestSuite(suiteId: string): TestSuite | null {
    return this.testSuites.get(suiteId) || null;
  }

  /**
   * Get latest test result
   */
  getTestResult(suiteId: string): TestSuiteResult | null {
    return this.testResults.get(suiteId) || null;
  }

  /**
   * Get A/B test result
   */
  getABTestResult(testId: string): ABTestResult | null {
    return this.abTestResults.get(testId) || null;
  }
}

/**
 * Singleton instance
 */
export const evaluationFramework = new EvaluationFrameworkManager();

/**
 * Common evaluation metrics
 */
export const COMMON_METRICS: Record<string, EvaluationMetric> = {
  JSON_VALID: {
    id: 'json-valid',
    name: 'Valid JSON',
    type: 'adherence',
    description: 'Output is valid JSON',
    method: 'automated',
    automatedCheck: {
      type: 'function',
      evaluator: (output) => {
        try {
          JSON.parse(String(output));
          return 1;
        } catch {
          return 0;
        }
      },
    },
    scoreRange: { min: 0, max: 1 },
    passingThreshold: 1,
    weight: 0.2,
    critical: true,
  },

  COMPLETENESS: {
    id: 'completeness',
    name: 'Completeness',
    type: 'completeness',
    description: 'All required fields present',
    method: 'automated',
    scoreRange: { min: 0, max: 1 },
    passingThreshold: 0.9,
    weight: 0.3,
    critical: true,
  },

  QUALITY: {
    id: 'quality',
    name: 'Output Quality',
    type: 'quality',
    description: 'Overall quality of output',
    method: 'llm-judge',
    llmJudgePrompt: 'Rate the quality of this output on a scale of 0-10',
    scoreRange: { min: 0, max: 10 },
    passingThreshold: 7,
    weight: 0.3,
  },

  PERFORMANCE: {
    id: 'performance',
    name: 'Performance',
    type: 'performance',
    description: 'Execution time efficiency',
    method: 'automated',
    automatedCheck: {
      type: 'function',
      evaluator: (_, context) => {
        // Score inversely with time (faster = better)
        const maxTime = 10000; // 10 seconds
        return Math.max(0, 1 - context.executionTime / maxTime);
      },
    },
    scoreRange: { min: 0, max: 1 },
    weight: 0.2,
  },
};
