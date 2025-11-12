/**
 * A/B Test Panel
 * UI for creating and running prompt A/B tests
 */

import { useState } from 'react';
import type {
  ABTestConfig,
  ABTestResult,
  PromptVariant,
  ABTestCase,
} from '@/lib/workflow/promptABTesting';
import { promptABTestingManager } from '@/lib/workflow/promptABTesting';
import type { WorkflowNode } from '@/types/workflow';

interface ABTestPanelProps {
  node: WorkflowNode;
  onClose?: () => void;
}

export function ABTestPanel({ node, onClose }: ABTestPanelProps) {
  const [viewMode, setViewMode] = useState<'create' | 'running' | 'results'>('create');
  const [currentTest, setCurrentTest] = useState<ABTestConfig | null>(null);
  const [testResult, setTestResult] = useState<ABTestResult | null>(null);

  // Create form state
  const [testName, setTestName] = useState('');
  const [variants, setVariants] = useState<PromptVariant[]>([
    {
      id: `variant-control-${Date.now()}`,
      name: 'Control (Original)',
      promptTemplate: node.data.promptTemplate || '',
      description: 'Original prompt',
      createdAt: Date.now(),
    },
  ]);
  const [testCases, setTestCases] = useState<ABTestCase[]>([]);
  const [primaryMetric, setPrimaryMetric] = useState('quality');

  const handleAddVariant = () => {
    const newVariant: PromptVariant = {
      id: `variant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `Variant ${variants.length}`,
      promptTemplate: '',
      createdAt: Date.now(),
    };
    setVariants([...variants, newVariant]);
  };

  const handleUpdateVariant = (index: number, field: keyof PromptVariant, value: string) => {
    const updated = [...variants];
    (updated[index] as any)[field] = value;
    setVariants(updated);
  };

  const handleRemoveVariant = (index: number) => {
    if (index === 0) {
      alert('Cannot remove control variant');
      return;
    }
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleAddTestCase = () => {
    const newTestCase: ABTestCase = {
      id: `testcase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      input: '',
      context: {},
    };
    setTestCases([...testCases, newTestCase]);
  };

  const handleUpdateTestCase = (index: number, field: string, value: any) => {
    const updated = [...testCases];
    (updated[index] as any)[field] = value;
    setTestCases(updated);
  };

  const handleRemoveTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const handleCreateTest = async () => {
    if (!testName || variants.length < 2 || testCases.length === 0) {
      alert('Please provide test name, at least 2 variants, and at least 1 test case');
      return;
    }

    const test = promptABTestingManager.createABTest({
      name: testName,
      nodeId: node.id,
      nodeName: node.data.label,
      variants,
      controlVariantId: variants[0].id,
      testCases,
      primaryMetric,
      metrics: [
        { name: 'quality', type: 'quality', higherIsBetter: true, weight: 1.0 },
        { name: 'accuracy', type: 'accuracy', higherIsBetter: true, weight: 0.8 },
        { name: 'completeness', type: 'custom', higherIsBetter: true, weight: 0.6 },
      ],
      confidenceLevel: 0.95,
      minSampleSize: testCases.length,
    });

    setCurrentTest(test);
    setViewMode('running');

    // Run test with mock executor
    const result = await promptABTestingManager.runABTest(test.id, async (variantId, testCase) => {
      // Mock execution - in production, would actually run the prompt
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        output: `Mock output for variant ${variantId} with input: ${testCase.input}`,
        executionTimeMs: 50 + Math.random() * 100,
        tokensUsed: 100 + Math.floor(Math.random() * 200),
        metrics: {
          quality: 0.5 + Math.random() * 0.5,
          accuracy: 0.6 + Math.random() * 0.4,
          completeness: 0.7 + Math.random() * 0.3,
        },
        passed: Math.random() > 0.2,
      };
    });

    setTestResult(result);
    setViewMode('results');
  };

  const renderCreateView = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Test Name *
        </label>
        <input
          type="text"
          value={testName}
          onChange={(e) => setTestName(e.target.value)}
          placeholder="e.g., Prompt Clarity Test"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Variants */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Prompt Variants (min 2) *
          </label>
          <button
            onClick={handleAddVariant}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            + Add Variant
          </button>
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {variants.map((variant, index) => (
            <div
              key={variant.id}
              className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-2">
                <input
                  type="text"
                  value={variant.name}
                  onChange={(e) => handleUpdateVariant(index, 'name', e.target.value)}
                  placeholder="Variant name"
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white mr-2"
                />
                {index > 0 && (
                  <button
                    onClick={() => handleRemoveVariant(index)}
                    className="px-2 py-1 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100 dark:bg-red-900/20"
                  >
                    Remove
                  </button>
                )}
              </div>

              <textarea
                value={variant.promptTemplate}
                onChange={(e) => handleUpdateVariant(index, 'promptTemplate', e.target.value)}
                placeholder="Enter prompt template..."
                rows={4}
                className="w-full px-2 py-1.5 text-xs font-mono border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white mb-2"
              />

              <input
                type="text"
                value={variant.description || ''}
                onChange={(e) => handleUpdateVariant(index, 'description', e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Test Cases */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Test Cases (min 1) *
          </label>
          <button
            onClick={handleAddTestCase}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            + Add Test Case
          </button>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {testCases.map((testCase, index) => (
            <div
              key={testCase.id}
              className="p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
            >
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={testCase.input as string}
                  onChange={(e) => handleUpdateTestCase(index, 'input', e.target.value)}
                  placeholder="Test input..."
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={() => handleRemoveTestCase(index)}
                  className="px-2 py-1 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100 dark:bg-red-900/20"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {testCases.length === 0 && (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
              No test cases added yet
            </div>
          )}
        </div>
      </div>

      {/* Primary Metric */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Primary Metric
        </label>
        <select
          value={primaryMetric}
          onChange={(e) => setPrimaryMetric(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="quality">Quality</option>
          <option value="accuracy">Accuracy</option>
          <option value="completeness">Completeness</option>
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleCreateTest}
          disabled={variants.length < 2 || testCases.length === 0 || !testName}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Run A/B Test
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );

  const renderRunningView = () => (
    <div className="space-y-4 text-center py-8">
      <div className="text-4xl mb-4">⚡</div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Running A/B Test...
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Testing {variants.length} variants against {testCases.length} test cases
      </p>
    </div>
  );

  const renderResultsView = () => {
    if (!testResult || !currentTest) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Test Results: {currentTest.name}
          </h4>
          <button
            onClick={() => {
              setViewMode('create');
              setCurrentTest(null);
              setTestResult(null);
            }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← New Test
          </button>
        </div>

        {/* Winner */}
        {testResult.winner && (
          <div className={`p-3 rounded ${
            testResult.winner.significantDifference
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
          }`}>
            <div className="flex items-start gap-2">
              <span className="text-lg">{testResult.winner.significantDifference ? '🏆' : '⚠️'}</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {testResult.winner.significantDifference ? 'Clear Winner' : 'Inconclusive'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  <strong>{testResult.winner.variantName}</strong> shows{' '}
                  {testResult.winner.improvement.toFixed(1)}% improvement
                  {!testResult.winner.significantDifference && ' (not statistically significant)'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Variant Comparison */}
        <div>
          <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Variant Performance
          </h5>
          <div className="space-y-2">
            {Object.values(testResult.variantStats).map(stats => (
              <div
                key={stats.variantId}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {stats.variantName}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    stats.passRate >= 80
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : stats.passRate >= 50
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {stats.passRate.toFixed(1)}% pass rate
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <div>
                    <div className="font-medium">Quality</div>
                    <div>{stats.metrics.quality?.mean.toFixed(2) || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="font-medium">Avg Time</div>
                    <div>{stats.avgExecutionTime.toFixed(0)}ms</div>
                  </div>
                  <div>
                    <div className="font-medium">Avg Cost</div>
                    <div>${stats.avgCost.toFixed(4)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {testResult.recommendations.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Recommendations
            </h5>
            <div className="space-y-1">
              {testResult.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-gray-700 dark:text-gray-300"
                >
                  {rec}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test Details */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-medium">Variants Tested:</span> {variants.length}
            </div>
            <div>
              <span className="font-medium">Test Cases:</span> {testCases.length}
            </div>
            <div>
              <span className="font-medium">Primary Metric:</span> {primaryMetric}
            </div>
            <div>
              <span className="font-medium">Total Results:</span> {testResult.results.length}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            A/B Test: {node.data.label}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Compare prompt variants with systematic testing
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {viewMode === 'create' && renderCreateView()}
      {viewMode === 'running' && renderRunningView()}
      {viewMode === 'results' && renderResultsView()}
    </div>
  );
}
