/**
 * Visual Condition Editor
 * Build routing conditions without writing code
 */

import { useState } from 'react';
import type {
  RoutingCondition,
  ConditionType,
  LoopConfig,
} from '@/lib/workflow/conditionalRouting';
import { CONDITION_TEMPLATES } from '@/lib/workflow/conditionalRouting';

interface ConditionEditorProps {
  condition?: RoutingCondition;
  onChange: (condition: RoutingCondition) => void;
  onCancel?: () => void;
  mode?: 'edge' | 'loop'; // Edge condition or loop exit condition
}

export function ConditionEditor({
  condition,
  onChange,
  onCancel,
  mode = 'edge',
}: ConditionEditorProps) {
  const [conditionType, setConditionType] = useState<ConditionType>(
    condition?.type || 'always'
  );
  const [stateKey, setStateKey] = useState(condition?.stateKey || '');
  const [operator, setOperator] = useState(condition?.operator || 'equals');
  const [value, setValue] = useState(String(condition?.value || ''));
  const [artifactPath, setArtifactPath] = useState(condition?.artifactPath || '');
  const [artifactSchema, setArtifactSchema] = useState(condition?.artifactSchema || '');
  const [maxIterations, setMaxIterations] = useState(condition?.maxIterations || 10);
  const [currentIterationKey, setCurrentIterationKey] = useState(
    condition?.currentIterationKey || 'iteration'
  );
  const [expression, setExpression] = useState(condition?.expression || '');
  const [label, setLabel] = useState(condition?.label || '');
  const [description, setDescription] = useState(condition?.description || '');
  const [priority, setPriority] = useState(condition?.priority || 0);

  const handleApply = () => {
    const newCondition: RoutingCondition = {
      type: conditionType,
      label,
      description,
      priority,
    };

    switch (conditionType) {
      case 'state-check':
        newCondition.stateKey = stateKey;
        newCondition.operator = operator;
        newCondition.value = parseValue(value);
        break;

      case 'artifact-exists':
      case 'artifact-valid':
        newCondition.artifactPath = artifactPath;
        if (artifactSchema) {
          newCondition.artifactSchema = artifactSchema;
        }
        break;

      case 'iteration-limit':
        newCondition.maxIterations = maxIterations;
        newCondition.currentIterationKey = currentIterationKey;
        break;

      case 'custom-expression':
        newCondition.expression = expression;
        break;
    }

    onChange(newCondition);
  };

  const handleTemplateSelect = (templateKey: string) => {
    const template = CONDITION_TEMPLATES[templateKey];
    if (template) {
      setConditionType(template.type);
      setLabel(template.label || '');
      setDescription(template.description || '');
      if (template.stateKey) setStateKey(template.stateKey);
      if (template.operator) setOperator(template.operator);
      if (template.value) setValue(String(template.value));
      if (template.artifactPath) setArtifactPath(template.artifactPath);
      if (template.maxIterations) setMaxIterations(template.maxIterations);
      if (template.currentIterationKey) setCurrentIterationKey(template.currentIterationKey);
      if (template.expression) setExpression(template.expression);
      if (template.priority) setPriority(template.priority);
    }
  };

  const parseValue = (str: string): unknown => {
    // Try to parse as number
    const num = Number(str);
    if (!isNaN(num)) return num;

    // Try to parse as boolean
    if (str === 'true') return true;
    if (str === 'false') return false;

    // Return as string
    return str;
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {mode === 'loop' ? 'Loop Exit Condition' : 'Edge Routing Condition'}
      </h3>

      {/* Template selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Quick Templates
        </label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(CONDITION_TEMPLATES).map(([key, template]) => (
            <button
              key={key}
              onClick={() => handleTemplateSelect(key)}
              className="px-3 py-2 text-xs text-left bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="font-medium text-gray-900 dark:text-white">
                {template.label}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                {template.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {/* Condition type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Condition Type
          </label>
          <select
            value={conditionType}
            onChange={(e) => setConditionType(e.target.value as ConditionType)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="always">Always</option>
            <option value="state-check">State Check</option>
            <option value="artifact-exists">Artifact Exists</option>
            <option value="artifact-valid">Artifact Valid</option>
            <option value="iteration-limit">Iteration Limit</option>
            <option value="custom-expression">Custom Expression</option>
          </select>
        </div>

        {/* Label and description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g., Quality Check Passed"
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
            placeholder="Describe when this condition should be satisfied..."
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Condition-specific fields */}
        {conditionType === 'state-check' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                State Key
              </label>
              <input
                type="text"
                value={stateKey}
                onChange={(e) => setStateKey(e.target.value)}
                placeholder="e.g., approved, quality_score, iteration"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Operator
              </label>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="equals">Equals</option>
                <option value="not-equals">Not Equals</option>
                <option value="greater-than">Greater Than</option>
                <option value="less-than">Less Than</option>
                <option value="contains">Contains</option>
                <option value="exists">Exists</option>
              </select>
            </div>

            {operator !== 'exists' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Value
                </label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g., true, 0.8, approved"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Will be auto-parsed as number, boolean, or string
                </p>
              </div>
            )}
          </>
        )}

        {(conditionType === 'artifact-exists' || conditionType === 'artifact-valid') && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Artifact Path
              </label>
              <input
                type="text"
                value={artifactPath}
                onChange={(e) => setArtifactPath(e.target.value)}
                placeholder="e.g., design.md, code/main.ts"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {conditionType === 'artifact-valid' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expected Schema (optional)
                </label>
                <input
                  type="text"
                  value={artifactSchema}
                  onChange={(e) => setArtifactSchema(e.target.value)}
                  placeholder="e.g., code-artifact, design-document"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            )}
          </>
        )}

        {conditionType === 'iteration-limit' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Iterations
              </label>
              <input
                type="number"
                value={maxIterations}
                onChange={(e) => setMaxIterations(Number(e.target.value))}
                min="1"
                max="100"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Iteration Counter State Key
              </label>
              <input
                type="text"
                value={currentIterationKey}
                onChange={(e) => setCurrentIterationKey(e.target.value)}
                placeholder="e.g., iteration, loop_count"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </>
        )}

        {conditionType === 'custom-expression' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              JavaScript Expression
            </label>
            <textarea
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="e.g., state.quality_score > 0.8 && artifacts.length > 0"
              rows={4}
              className="w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Available context: state (workflow state), artifacts (array), currentNode (ID)
            </p>
          </div>
        )}

        {/* Priority (for edge conditions only) */}
        {mode === 'edge' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority (higher = evaluated first)
            </label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              min="0"
              max="100"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Apply Condition
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Condition preview */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Condition Preview:
          </div>
          <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
            {JSON.stringify(
              {
                type: conditionType,
                label,
                description,
                ...(conditionType === 'state-check' && {
                  stateKey,
                  operator,
                  ...(operator !== 'exists' && { value: parseValue(value) }),
                }),
                ...(conditionType === 'artifact-exists' && { artifactPath }),
                ...(conditionType === 'artifact-valid' && {
                  artifactPath,
                  ...(artifactSchema && { artifactSchema }),
                }),
                ...(conditionType === 'iteration-limit' && {
                  maxIterations,
                  currentIterationKey,
                }),
                ...(conditionType === 'custom-expression' && { expression }),
                ...(mode === 'edge' && priority > 0 && { priority }),
              },
              null,
              2
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}

/**
 * Loop Configuration Editor
 */
interface LoopEditorProps {
  loop?: Partial<LoopConfig>;
  nodes: Array<{ id: string; label: string }>;
  onChange: (loop: LoopConfig) => void;
  onCancel?: () => void;
}

export function LoopEditor({ loop, nodes, onChange, onCancel }: LoopEditorProps) {
  const [name, setName] = useState(loop?.name || '');
  const [description, setDescription] = useState(loop?.description || '');
  const [entryNodeId, setEntryNodeId] = useState(loop?.entryNodeId || '');
  const [exitNodeId, setExitNodeId] = useState(loop?.exitNodeId || '');
  const [loopNodeIds, setLoopNodeIds] = useState<string[]>(loop?.loopNodeIds || []);
  const [maxIterations, setMaxIterations] = useState(loop?.maxIterations || 10);
  const [exitCondition, setExitCondition] = useState<RoutingCondition>(
    loop?.repeatUntil || { type: 'always' }
  );
  const [showConditionEditor, setShowConditionEditor] = useState(false);

  const handleApply = () => {
    if (!name || !entryNodeId || !exitNodeId) {
      alert('Please fill in all required fields');
      return;
    }

    const loopConfig: LoopConfig = {
      id: loop?.id || `loop-${Date.now()}`,
      name,
      description,
      entryNodeId,
      exitNodeId,
      loopNodeIds,
      repeatUntil: exitCondition,
      maxIterations,
      currentIteration: 0,
      iterationStateKey: `${name.replace(/\s+/g, '_')}_iteration`,
      loopStateKey: `${name.replace(/\s+/g, '_')}_state`,
    };

    onChange(loopConfig);
  };

  const toggleNodeInLoop = (nodeId: string) => {
    setLoopNodeIds(prev =>
      prev.includes(nodeId)
        ? prev.filter(id => id !== nodeId)
        : [...prev, nodeId]
    );
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Loop Configuration
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Loop Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Quality Improvement Loop"
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
            placeholder="Describe the purpose of this loop..."
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Entry Node *
            </label>
            <select
              value={entryNodeId}
              onChange={(e) => setEntryNodeId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Select entry node...</option>
              {nodes.map(node => (
                <option key={node.id} value={node.id}>
                  {node.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Exit Node *
            </label>
            <select
              value={exitNodeId}
              onChange={(e) => setExitNodeId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Select exit node...</option>
              {nodes.map(node => (
                <option key={node.id} value={node.id}>
                  {node.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nodes in Loop
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded">
            {nodes.map(node => (
              <label
                key={node.id}
                className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={loopNodeIds.includes(node.id)}
                  onChange={() => toggleNodeInLoop(node.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900 dark:text-white">
                  {node.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Max Iterations (safety limit)
          </label>
          <input
            type="number"
            value={maxIterations}
            onChange={(e) => setMaxIterations(Number(e.target.value))}
            min="1"
            max="100"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Exit Condition (repeat UNTIL this is true)
          </label>
          {showConditionEditor ? (
            <ConditionEditor
              condition={exitCondition}
              onChange={(newCondition) => {
                setExitCondition(newCondition);
                setShowConditionEditor(false);
              }}
              onCancel={() => setShowConditionEditor(false)}
              mode="loop"
            />
          ) : (
            <div
              onClick={() => setShowConditionEditor(true)}
              className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-blue-500 transition-colors"
            >
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {exitCondition.label || exitCondition.type}
              </div>
              {exitCondition.description && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {exitCondition.description}
                </div>
              )}
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Click to edit condition
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Apply Loop Configuration
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
