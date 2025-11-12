/**
 * Evaluation Panel
 * Manage test suites, view results, run A/B tests
 */

import { useState } from 'react';
import type {
  TestSuite,
  TestCase,
  TestSuiteResult,
  EvaluationMetric,
  ABTestConfig,
  ABTestResult,
} from '@/lib/workflow/evaluationFramework';
import { evaluationFramework, COMMON_METRICS } from '@/lib/workflow/evaluationFramework';

type ViewMode = 'suites' | 'results' | 'ab-tests';

export function EvaluationPanel() {
  const [viewMode, setViewMode] = useState<ViewMode>('suites');
  const [selectedSuiteId, setSelectedSuiteId] = useState<string | null>(null);
  const [showCreateSuite, setShowCreateSuite] = useState(false);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Evaluation Framework
        </h2>

        {/* View mode toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('suites')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded ${
              viewMode === 'suites'
                ? 'text-white bg-blue-600'
                : 'text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Test Suites
          </button>
          <button
            onClick={() => setViewMode('results')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded ${
              viewMode === 'results'
                ? 'text-white bg-blue-600'
                : 'text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Results
          </button>
          <button
            onClick={() => setViewMode('ab-tests')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded ${
              viewMode === 'ab-tests'
                ? 'text-white bg-blue-600'
                : 'text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            A/B Tests
          </button>
        </div>

        {viewMode === 'suites' && (
          <button
            onClick={() => setShowCreateSuite(true)}
            className="w-full mt-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Create Test Suite
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === 'suites' && (
          <div className="space-y-3">
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p className="text-sm">No test suites yet</p>
              <p className="text-xs mt-1">
                Create test suites to evaluate workflow quality
              </p>
            </div>
          </div>
        )}

        {viewMode === 'results' && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-sm">No test results yet</p>
            <p className="text-xs mt-1">
              Run test suites to see evaluation results
            </p>
          </div>
        )}

        {viewMode === 'ab-tests' && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-sm">No A/B tests yet</p>
            <p className="text-xs mt-1">
              Create A/B tests to compare prompt variants
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Test Suite Builder Component
 */
interface TestSuiteBuilderProps {
  onComplete: (suite: TestSuite) => void;
  onCancel: () => void;
}

export function TestSuiteBuilder({ onComplete, onCancel }: TestSuiteBuilderProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetType, setTargetType] = useState<'workflow' | 'agent' | 'artifact'>('workflow');
  const [targetId, setTargetId] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [testCases, setTestCases] = useState<Array<Omit<TestCase, 'id'>>>([]);

  const handleCreate = () => {
    if (!name || !targetId || selectedMetrics.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    const metrics = selectedMetrics.map(id => COMMON_METRICS[id]);

    const suite = evaluationFramework.createTestSuite({
      name,
      description,
      targetType,
      targetId,
      testCases,
      metrics,
      version: '1.0.0',
    });

    onComplete(suite);
  };

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metricId)
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Create Test Suite
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Suite Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Code Quality Tests"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this test suite evaluates..."
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Type *
            </label>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as any)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="workflow">Workflow</option>
              <option value="agent">Agent</option>
              <option value="artifact">Artifact</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target ID *
            </label>
            <input
              type="text"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="e.g., workflow-123"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Evaluation Metrics *
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto p-3 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800">
            {Object.entries(COMMON_METRICS).map(([id, metric]) => (
              <label
                key={id}
                className="flex items-start gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedMetrics.includes(id)}
                  onChange={() => toggleMetric(id)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {metric.name}
                    </span>
                    {metric.critical && (
                      <span className="text-xs px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">
                        critical
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {metric.description}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>Method: {metric.method}</span>
                    <span>Weight: {(metric.weight * 100).toFixed(0)}%</span>
                    <span>Range: {metric.scoreRange.min}-{metric.scoreRange.max}</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleCreate}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Create Test Suite
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Test Result Display Component
 */
interface TestResultDisplayProps {
  result: TestSuiteResult;
}

export function TestResultDisplay({ result }: TestResultDisplayProps) {
  const passRate = (result.passed / result.totalTests) * 100;

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {result.suiteName}
        </h3>

        {/* Overall stats */}
        <div className="grid grid-cols-4 gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {result.totalTests}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Total Tests</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {result.passed}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Passed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {result.failed}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Failed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {passRate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Pass Rate</div>
          </div>
        </div>

        {/* Overall score */}
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Overall Score
            </span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {(result.overallScore * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${result.overallScore * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Metric scores */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          Metric Scores
        </h4>
        <div className="space-y-2">
          {Object.entries(result.metricScores).map(([metricId, score]) => {
            const metric = COMMON_METRICS[metricId];
            if (!metric) return null;

            const normalizedScore = (score - metric.scoreRange.min) /
                                   (metric.scoreRange.max - metric.scoreRange.min);

            return (
              <div key={metricId} className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-900 dark:text-white">
                    {metric.name}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {score.toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      normalizedScore >= 0.7
                        ? 'bg-green-600'
                        : normalizedScore >= 0.4
                        ? 'bg-yellow-600'
                        : 'bg-red-600'
                    }`}
                    style={{ width: `${normalizedScore * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Coverage */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          Test Coverage
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <span className="text-gray-600 dark:text-gray-400">Normal:</span>{' '}
            <span className="font-medium text-gray-900 dark:text-white">
              {result.coverage.normal.toFixed(1)}%
            </span>
          </div>
          <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <span className="text-gray-600 dark:text-gray-400">Edge Cases:</span>{' '}
            <span className="font-medium text-gray-900 dark:text-white">
              {result.coverage.edgeCase.toFixed(1)}%
            </span>
          </div>
          <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <span className="text-gray-600 dark:text-gray-400">Malformed:</span>{' '}
            <span className="font-medium text-gray-900 dark:text-white">
              {result.coverage.malformed.toFixed(1)}%
            </span>
          </div>
          <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <span className="text-gray-600 dark:text-gray-400">Adversarial:</span>{' '}
            <span className="font-medium text-gray-900 dark:text-white">
              {result.coverage.adversarial.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Recommendations
          </h4>
          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Critical failures */}
      {result.criticalFailures.length > 0 && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-red-900 dark:text-red-200">
              ⚠️ Critical Failures
            </span>
          </div>
          <div className="text-xs text-red-800 dark:text-red-300">
            {result.criticalFailures.length} test(s) failed critical metrics
          </div>
        </div>
      )}

      {/* Execution stats */}
      <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
          <div>
            Execution Time: <span className="font-medium">{result.totalExecutionTime}ms</span>
          </div>
          {result.totalTokenUsage && (
            <div>
              Token Usage: <span className="font-medium">{result.totalTokenUsage.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
