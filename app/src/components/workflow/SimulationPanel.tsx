/**
 * Simulation Panel
 * UI for running and viewing workflow simulations
 */

import { useState, useEffect } from 'react';
import type {
  SimulationResult,
  SimulationConfig,
  SimulationMode,
  SimulationStep,
  SimulationEvent,
} from '@/lib/workflow/workflowSimulation';
import { workflowSimulator } from '@/lib/workflow/workflowSimulation';
import type { WorkflowGraph } from '@/types/workflow';

interface SimulationPanelProps {
  workflow: WorkflowGraph;
  onClose?: () => void;
}

export function SimulationPanel({ workflow, onClose }: SimulationPanelProps) {
  const [viewMode, setViewMode] = useState<'config' | 'running' | 'results'>('config');
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [selectedStep, setSelectedStep] = useState<SimulationStep | null>(null);

  // Config state
  const [mode, setMode] = useState<SimulationMode>('fast-forward');
  const [breakpoints, setBreakpoints] = useState<string[]>([]);
  const [maxSteps, setMaxSteps] = useState(1000);
  const [mockInputs, setMockInputs] = useState<string>('{}');

  useEffect(() => {
    if (simulation) {
      const listener = (event: SimulationEvent) => {
        if (event.type === 'step-complete' || event.type === 'complete') {
          setSimulation(prev => event.result || prev);
        }
      };

      workflowSimulator.addEventListener(simulation.id, listener);
      return () => workflowSimulator.removeEventListener(simulation.id, listener);
    }
  }, [simulation?.id]);

  const handleStartSimulation = async () => {
    let inputs = {};
    try {
      inputs = JSON.parse(mockInputs);
    } catch (e) {
      alert('Invalid JSON for mock inputs');
      return;
    }

    const config: SimulationConfig = {
      mode,
      breakpoints: breakpoints.length > 0 ? breakpoints : undefined,
      maxSteps,
      mockInputs: inputs,
      costPerToken: 0.000015, // Claude Sonnet pricing
    };

    setViewMode('running');

    const result = await workflowSimulator.startSimulation(workflow, config);
    setSimulation(result);

    if (result.status === 'completed' || result.status === 'failed') {
      setViewMode('results');
    }
  };

  const handleViewResults = () => {
    setViewMode('results');
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatCost = (cost: number): string => {
    return `$${cost.toFixed(4)}`;
  };

  const renderConfigView = () => (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          Simulation Configuration
        </h4>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Simulation Mode
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as SimulationMode)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="fast-forward">Fast Forward (run all steps)</option>
              <option value="step-by-step">Step-by-Step (pause at each)</option>
              <option value="breakpoints">Breakpoints (pause at selected nodes)</option>
            </select>
          </div>

          {mode === 'breakpoints' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Breakpoints (Node IDs)
              </label>
              <div className="space-y-1 max-h-32 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded">
                {workflow.nodes.map(node => (
                  <label
                    key={node.id}
                    className="flex items-center gap-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 p-1 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={breakpoints.includes(node.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBreakpoints([...breakpoints, node.id]);
                        } else {
                          setBreakpoints(breakpoints.filter(id => id !== node.id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-gray-900 dark:text-white">{node.data.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mock Inputs (JSON)
            </label>
            <textarea
              value={mockInputs}
              onChange={(e) => setMockInputs(e.target.value)}
              rows={4}
              placeholder='{"key": "value"}'
              className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Steps (prevent infinite loops)
            </label>
            <input
              type="number"
              value={maxSteps}
              onChange={(e) => setMaxSteps(Number(e.target.value))}
              min="10"
              max="10000"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
        <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          Workflow Summary
        </h5>
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <p>• <strong>Nodes:</strong> {workflow.nodes.length}</p>
          <p>• <strong>Edges:</strong> {workflow.edges.length}</p>
          <p>• <strong>Mode:</strong> {workflow.mode}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleStartSimulation}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          Start Simulation
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
          Simulation Running...
        </h4>
        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded dark:bg-blue-900/20 dark:text-blue-400">
          {simulation?.status}
        </span>
      </div>

      {simulation && (
        <>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p>• <strong>Steps:</strong> {simulation.currentStep} / {simulation.steps.length}</p>
              <p>• <strong>Coverage:</strong> {simulation.coveragePercentage.toFixed(1)}%</p>
              <p>• <strong>Elapsed:</strong> {formatTime(Date.now() - simulation.startedAt)}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleViewResults}
              disabled={simulation.steps.length === 0}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              View Results
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderResultsView = () => {
    if (!simulation) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Simulation Results
          </h4>
          <button
            onClick={() => setViewMode('config')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← New Simulation
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-xs text-gray-600 dark:text-gray-400">Status</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
              {simulation.status}
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-xs text-gray-600 dark:text-gray-400">Coverage</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {simulation.coveragePercentage.toFixed(1)}%
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-xs text-gray-600 dark:text-gray-400">Est. Time</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatTime(simulation.totalEstimatedTime)}
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-xs text-gray-600 dark:text-gray-400">Est. Cost</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatCost(simulation.totalEstimatedCost)}
            </div>
          </div>
        </div>

        {/* Validation Errors/Warnings */}
        {(simulation.validationErrors.length > 0 || simulation.validationWarnings.length > 0) && (
          <div className="space-y-2">
            {simulation.validationErrors.map((error, i) => (
              <div key={i} className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-800 dark:text-red-400">
                ❌ {error}
              </div>
            ))}
            {simulation.validationWarnings.map((warning, i) => (
              <div key={i} className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-800 dark:text-yellow-400">
                ⚠️ {warning}
              </div>
            ))}
          </div>
        )}

        {/* Analysis */}
        <div>
          <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Execution Analysis
          </h5>
          <div className="space-y-2">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Critical Path ({simulation.criticalPath.length} nodes)
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {simulation.criticalPath.map(nodeId => {
                  const node = workflow.nodes.find(n => n.id === nodeId);
                  return node?.data.label || nodeId;
                }).join(' → ')}
              </div>
            </div>

            {simulation.parallelBlocks.length > 0 && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Parallel Execution (peak: {simulation.peakParallelism} agents)
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {simulation.parallelBlocks.length} parallel blocks identified
                </div>
              </div>
            )}

            {simulation.bottlenecks.length > 0 && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                <div className="text-xs font-medium text-gray-900 dark:text-white mb-2">
                  Bottlenecks ({simulation.bottlenecks.length})
                </div>
                <div className="space-y-1">
                  {simulation.bottlenecks.slice(0, 3).map((bottleneck, i) => {
                    const node = workflow.nodes.find(n => n.id === bottleneck.nodeId);
                    return (
                      <div key={i} className="text-xs text-gray-600 dark:text-gray-400">
                        • <strong>{node?.data.label}</strong>: {bottleneck.reason}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Execution Steps */}
        <div>
          <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Execution Steps ({simulation.steps.length})
          </h5>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {simulation.steps.map((step, i) => (
              <button
                key={i}
                onClick={() => setSelectedStep(step)}
                className={`w-full p-2 text-left rounded border transition-colors ${
                  selectedStep?.stepNumber === step.stepNumber
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-900 dark:text-white">
                    {step.stepNumber}. {step.nodeName}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(step.executionTimeMs)}
                  </span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {step.estimatedTokens} tokens • {formatCost(step.estimatedCost)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Step Details */}
        {selectedStep && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            <h6 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Step {selectedStep.stepNumber}: {selectedStep.nodeName}
            </h6>
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Inputs:</span>
                <pre className="mt-1 p-2 bg-gray-900 text-gray-100 rounded overflow-x-auto">
                  {JSON.stringify(selectedStep.inputs, null, 2)}
                </pre>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Outputs:</span>
                <pre className="mt-1 p-2 bg-gray-900 text-gray-100 rounded overflow-x-auto">
                  {JSON.stringify(selectedStep.outputs, null, 2)}
                </pre>
              </div>
              {selectedStep.nextNodes.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Next Nodes:</span>
                  <div className="mt-1 text-gray-600 dark:text-gray-400">
                    {selectedStep.nextNodes.join(', ')}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Workflow Simulation
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {viewMode === 'config' && renderConfigView()}
      {viewMode === 'running' && renderRunningView()}
      {viewMode === 'results' && renderResultsView()}
    </div>
  );
}
