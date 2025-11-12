/**
 * Scatter-Gather Pattern Builder
 * Visual builder for scatter-gather orchestration patterns
 */

import { useState } from 'react';
import type {
  ScatterGatherConfig,
  ScatterStrategy,
  GatherStrategy,
  AggregationStrategy,
} from '@/lib/workflow/scatterGather';
import { scatterGatherManager } from '@/lib/workflow/scatterGather';

interface ScatterGatherBuilderProps {
  availableAgents: Array<{ id: string; label: string; role: string }>;
  onComplete: (config: ScatterGatherConfig) => void;
  onCancel: () => void;
}

export function ScatterGatherBuilder({
  availableAgents,
  onComplete,
  onCancel,
}: ScatterGatherBuilderProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scatterStrategy, setScatterStrategy] = useState<ScatterStrategy>('broadcast');
  const [gatherStrategy, setGatherStrategy] = useState<GatherStrategy>('wait-all');
  const [aggregationStrategy, setAggregationStrategy] = useState<AggregationStrategy>('merge');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [timeout, setTimeout] = useState<number>(30000);
  const [minResults, setMinResults] = useState<number>(1);
  const [qualityMetric, setQualityMetric] = useState('score');
  const [qualityDirection, setQualityDirection] = useState<'maximize' | 'minimize'>('maximize');

  const handleCreate = () => {
    if (!name || selectedAgents.length < 2) {
      alert('Please provide a name and select at least 2 agents');
      return;
    }

    const config = scatterGatherManager.registerConfig({
      name,
      description,
      scatterStrategy,
      targetAgents: selectedAgents,
      gatherStrategy,
      timeout: gatherStrategy === 'timeout' ? timeout : undefined,
      minResults: gatherStrategy === 'wait-majority' ? minResults : undefined,
      aggregationStrategy,
      qualityCriteria: aggregationStrategy === 'best-of' ? {
        metric: qualityMetric,
        direction: qualityDirection,
      } : undefined,
      failureMode: 'partial-results',
    });

    onComplete(config);
  };

  const toggleAgent = (agentId: string) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Scatter-Gather Pattern Builder
      </h3>

      <div className="space-y-4">
        {/* Name and description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Pattern Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Parallel Code Review"
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
            placeholder="Describe the scatter-gather pattern..."
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Scatter strategy */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Scatter Strategy (How to distribute work)
          </label>
          <select
            value={scatterStrategy}
            onChange={(e) => setScatterStrategy(e.target.value as ScatterStrategy)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="broadcast">Broadcast (same task to all)</option>
            <option value="split-by-type">Split by Type</option>
            <option value="round-robin">Round Robin</option>
            <option value="load-balanced">Load Balanced</option>
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {scatterStrategy === 'broadcast' && 'Send identical task to all agents'}
            {scatterStrategy === 'split-by-type' && 'Route different types to different agents'}
            {scatterStrategy === 'round-robin' && 'Distribute evenly across agents'}
            {scatterStrategy === 'load-balanced' && 'Balance load based on capacity'}
          </p>
        </div>

        {/* Target agents */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target Agents (Select at least 2) *
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded">
            {availableAgents.map(agent => (
              <label
                key={agent.id}
                className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedAgents.includes(agent.id)}
                  onChange={() => toggleAgent(agent.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900 dark:text-white">
                  {agent.label}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({agent.role})
                </span>
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Selected: {selectedAgents.length} agents
          </p>
        </div>

        {/* Gather strategy */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Gather Strategy (When to collect results)
          </label>
          <select
            value={gatherStrategy}
            onChange={(e) => setGatherStrategy(e.target.value as GatherStrategy)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="wait-all">Wait for All</option>
            <option value="wait-first">Wait for First</option>
            <option value="wait-majority">Wait for Majority</option>
            <option value="timeout">Wait Until Timeout</option>
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {gatherStrategy === 'wait-all' && 'Wait for all agents to complete'}
            {gatherStrategy === 'wait-first' && 'Return as soon as first agent completes'}
            {gatherStrategy === 'wait-majority' && 'Wait for majority (>50%) to complete'}
            {gatherStrategy === 'timeout' && 'Collect results that complete within timeout'}
          </p>
        </div>

        {/* Timeout (for timeout strategy) */}
        {gatherStrategy === 'timeout' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Timeout (milliseconds)
            </label>
            <input
              type="number"
              value={timeout}
              onChange={(e) => setTimeout(Number(e.target.value))}
              min="1000"
              max="300000"
              step="1000"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        )}

        {/* Aggregation strategy */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Aggregation Strategy (How to combine results)
          </label>
          <select
            value={aggregationStrategy}
            onChange={(e) => setAggregationStrategy(e.target.value as AggregationStrategy)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="merge">Merge (combine objects)</option>
            <option value="concatenate">Concatenate (join arrays/strings)</option>
            <option value="vote">Vote (majority vote)</option>
            <option value="best-of">Best Of (pick best result)</option>
            <option value="consensus">Consensus (require agreement)</option>
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {aggregationStrategy === 'merge' && 'Merge all results into single object'}
            {aggregationStrategy === 'concatenate' && 'Concatenate arrays or strings'}
            {aggregationStrategy === 'vote' && 'Pick result with most votes'}
            {aggregationStrategy === 'best-of' && 'Select best result based on quality metric'}
            {aggregationStrategy === 'consensus' && 'Require agreement among results'}
          </p>
        </div>

        {/* Quality criteria (for best-of) */}
        {aggregationStrategy === 'best-of' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quality Metric
              </label>
              <input
                type="text"
                value={qualityMetric}
                onChange={(e) => setQualityMetric(e.target.value)}
                placeholder="e.g., score, confidence, length"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Direction
              </label>
              <select
                value={qualityDirection}
                onChange={(e) => setQualityDirection(e.target.value as 'maximize' | 'minimize')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="maximize">Maximize (higher is better)</option>
                <option value="minimize">Minimize (lower is better)</option>
              </select>
            </div>
          </div>
        )}

        {/* Pattern summary */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Pattern Summary
          </h4>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <p>1. <strong>Scatter</strong> work to {selectedAgents.length} agents using {scatterStrategy}</p>
            <p>2. <strong>Execute</strong> agents in parallel</p>
            <p>3. <strong>Gather</strong> results ({gatherStrategy})</p>
            <p>4. <strong>Aggregate</strong> using {aggregationStrategy}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleCreate}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Create Scatter-Gather Pattern
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
