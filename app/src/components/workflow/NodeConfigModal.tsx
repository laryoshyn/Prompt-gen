import { useState, useEffect } from 'react';
import type { WorkflowNode } from '@/types/workflow';
import { useWorkflowStore } from '@/store/workflowStore';
import { ABTestPanel } from './ABTestPanel';

/**
 * Node Configuration Modal
 * Features:
 * - Edit agent label
 * - Edit description (displayed on canvas)
 * - Edit domain/specialization (displayed highlighted on canvas)
 * - Configure thinking mode (minimal/balanced/extended)
 * - Toggle parallel execution
 * - Define inputs/outputs (artifact names)
 * - Set success criteria
 * - Configure failure handling
 * - Edit prompt template
 */

interface NodeConfigModalProps {
  node: WorkflowNode | null;
  onClose: () => void;
}

export function NodeConfigModal({ node, onClose }: NodeConfigModalProps) {
  const { updateNodeData, deleteNode } = useWorkflowStore();

  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState('');
  const [thinkingMode, setThinkingMode] = useState<'minimal' | 'balanced' | 'extended'>('balanced');
  const [parallel, setParallel] = useState(false);
  const [timeout, setTimeout] = useState<number | undefined>(undefined);
  const [retries, setRetries] = useState<number | undefined>(undefined);
  const [inputs, setInputs] = useState<string>('');
  const [outputs, setOutputs] = useState<string>('');
  const [successCriteria, setSuccessCriteria] = useState('');
  const [onFailure, setOnFailure] = useState<'retry' | 'skip' | 'abort'>('retry');
  const [promptTemplate, setPromptTemplate] = useState('');
  const [showABTest, setShowABTest] = useState(false);

  useEffect(() => {
    if (node) {
      setLabel(node.data.label);
      setDescription(node.data.description || '');
      setDomain(node.data.domain || '');
      setThinkingMode(node.data.config.thinkingMode);
      setParallel(node.data.config.parallel);
      setTimeout(node.data.config.timeout);
      setRetries(node.data.config.retries);
      setInputs(node.data.inputs.join(', '));
      setOutputs(node.data.outputs.join(', '));
      setSuccessCriteria(node.data.successCriteria || '');
      setOnFailure(node.data.onFailure || 'retry');
      setPromptTemplate(node.data.promptTemplate);
    }
  }, [node]);

  if (!node) return null;

  const handleSave = () => {
    updateNodeData(node.id, {
      label,
      description: description || undefined,
      domain: domain || undefined,
      config: {
        thinkingMode,
        parallel,
        timeout,
        retries,
      },
      inputs: inputs.split(',').map(s => s.trim()).filter(Boolean),
      outputs: outputs.split(',').map(s => s.trim()).filter(Boolean),
      successCriteria: successCriteria || undefined,
      onFailure,
      promptTemplate,
    });
    onClose();
  };

  const handleDelete = () => {
    if (confirm(`Delete agent "${node.data.label}"?`)) {
      deleteNode(node.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Configure Agent</h2>
            <p className="text-sm text-gray-500 mt-1">
              {node.data.role.charAt(0).toUpperCase() + node.data.role.slice(1).replace('-', ' ')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowABTest(!showABTest)}
              className="px-4 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
            >
              🧪 A/B Test
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        {showABTest ? (
          <ABTestPanel node={node} onClose={() => setShowABTest(false)} />
        ) : (
          <div className="p-6 space-y-6">
          {/* Basic Settings */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Agent Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 'Requirements Analyzer'"
            />
            <p className="text-xs text-gray-500 mt-1">
              A descriptive name for this agent instance
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 'Analyzes requirements and identifies gaps'"
            />
            <p className="text-xs text-gray-500 mt-1">
              Brief description of what this agent does (shown on canvas)
            </p>
          </div>

          {/* Domain */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Domain / Specialization
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 'Security Expert with concentration on penetration testing'"
            />
            <p className="text-xs text-gray-500 mt-1">
              The agent's area of expertise (shown highlighted on canvas)
            </p>
          </div>

          {/* Thinking Mode */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Thinking Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setThinkingMode('minimal')}
                className={`px-4 py-2 rounded border-2 ${
                  thinkingMode === 'minimal'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700'
                }`}
              >
                ⚡ Minimal
              </button>
              <button
                onClick={() => setThinkingMode('balanced')}
                className={`px-4 py-2 rounded border-2 ${
                  thinkingMode === 'balanced'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700'
                }`}
              >
                ⚖️ Balanced
              </button>
              <button
                onClick={() => setThinkingMode('extended')}
                className={`px-4 py-2 rounded border-2 ${
                  thinkingMode === 'extended'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700'
                }`}
              >
                🧠 Extended
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Extended thinking for complex reasoning, minimal for straightforward tasks
            </p>
          </div>

          {/* Execution Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={parallel}
                  onChange={(e) => setParallel(e.target.checked)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Allow Parallel Execution
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                Can run concurrently with other parallel agents
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Timeout (seconds)
              </label>
              <input
                type="number"
                value={timeout || ''}
                onChange={(e) => setTimeout(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Failure Handling */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                On Failure
              </label>
              <select
                value={onFailure}
                onChange={(e) => setOnFailure(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="retry">Retry</option>
                <option value="skip">Skip</option>
                <option value="abort">Abort Workflow</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Max Retries
              </label>
              <input
                type="number"
                value={retries || ''}
                onChange={(e) => setRetries(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Inputs/Outputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Input Artifacts
              </label>
              <input
                type="text"
                value={inputs}
                onChange={(e) => setInputs(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., requirements, design-doc"
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated artifact names this agent consumes
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Output Artifacts
              </label>
              <input
                type="text"
                value={outputs}
                onChange={(e) => setOutputs(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., analysis, recommendations"
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated artifact names this agent produces
              </p>
            </div>
          </div>

          {/* Success Criteria */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Success Criteria (Optional)
            </label>
            <textarea
              value={successCriteria}
              onChange={(e) => setSuccessCriteria(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="e.g., Output includes 3+ recommendations with evidence"
            />
          </div>

          {/* Prompt Template */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Prompt Template
            </label>
            <textarea
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use variables like {'{{objective}}'}, {'{{input_artifacts}}'}, {'{{previous_output}}'}
            </p>
          </div>
        </div>
        )}

        {/* Actions */}
        {!showABTest && (
        <div className="p-6 border-t border-gray-200 flex justify-between sticky bottom-0 bg-white">
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete Agent
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
