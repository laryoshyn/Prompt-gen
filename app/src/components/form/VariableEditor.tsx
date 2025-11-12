import { useState } from 'react';
import type { Variable } from '@/types/prompt';
import { formatVariable, getVariableSyntaxExamples } from '@/lib/variables/parser';

interface VariableEditorProps {
  variables: Variable[];
  onChange: (variables: Variable[]) => void;
  detectedVariables?: Variable[];
}

export function VariableEditor({ variables, onChange, detectedVariables = [] }: VariableEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newVariable, setNewVariable] = useState<Variable>({
    name: '',
    defaultValue: '',
    required: true,
    description: '',
  });

  const handleAdd = () => {
    if (!newVariable.name.trim()) return;

    // Check if variable already exists
    const exists = variables.some((v) => v.name === newVariable.name);
    if (exists) {
      alert(`Variable "${newVariable.name}" already exists`);
      return;
    }

    onChange([...variables, { ...newVariable }]);
    setNewVariable({
      name: '',
      defaultValue: '',
      required: true,
      description: '',
    });
    setIsAdding(false);
  };

  const handleUpdate = (index: number, updated: Partial<Variable>) => {
    const newVariables = [...variables];
    newVariables[index] = { ...newVariables[index], ...updated };
    onChange(newVariables);
  };

  const handleDelete = (index: number) => {
    const newVariables = variables.filter((_, i) => i !== index);
    onChange(newVariables);
  };

  const handleSyncDetected = () => {
    // Merge detected variables with existing ones
    const merged = [...variables];

    detectedVariables.forEach((detected) => {
      const existingIndex = merged.findIndex((v) => v.name === detected.name);
      if (existingIndex === -1) {
        // Add new detected variable
        merged.push(detected);
      } else {
        // Update existing variable with detected properties
        merged[existingIndex] = {
          ...merged[existingIndex],
          required: detected.required || merged[existingIndex].required,
          defaultValue: detected.defaultValue || merged[existingIndex].defaultValue,
          description: detected.description || merged[existingIndex].description,
        };
      }
    });

    onChange(merged);
  };

  const syntaxExamples = getVariableSyntaxExamples();

  return (
    <div className="space-y-4">
      {/* Syntax Help */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Variable Syntax</h4>
        <div className="text-xs text-blue-800 space-y-1">
          {syntaxExamples.map((example, i) => (
            <div key={i} className="font-mono">{example}</div>
          ))}
        </div>
      </div>

      {/* Detected Variables Alert */}
      {detectedVariables.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start justify-between">
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-yellow-900 mb-1">
              {detectedVariables.length} variable{detectedVariables.length > 1 ? 's' : ''} detected in prompt text
            </h4>
            <p className="text-xs text-yellow-800">
              {detectedVariables.map((v) => v.name).join(', ')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSyncDetected}
            className="ml-2 px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
          >
            Sync
          </button>
        </div>
      )}

      {/* Variable List */}
      {variables.length > 0 && (
        <div className="space-y-2">
          {variables.map((variable, index) => (
            <div key={index} className="border border-gray-300 rounded-md p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={variable.name}
                      onChange={(e) => handleUpdate(index, { name: e.target.value })}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Variable name"
                    />
                    <label className="flex items-center text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={variable.required}
                        onChange={(e) => handleUpdate(index, { required: e.target.checked })}
                        className="mr-1"
                      />
                      Required
                    </label>
                  </div>

                  <input
                    type="text"
                    value={variable.defaultValue || ''}
                    onChange={(e) => handleUpdate(index, { defaultValue: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 mb-2"
                    placeholder="Default value (optional)"
                  />

                  <input
                    type="text"
                    value={variable.description || ''}
                    onChange={(e) => handleUpdate(index, { description: e.target.value })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Description (optional)"
                  />

                  {/* Preview Syntax */}
                  <div className="mt-2 text-xs text-gray-600">
                    <span className="font-semibold">Syntax:</span>{' '}
                    <code className="bg-gray-100 px-1 py-0.5 rounded">{formatVariable(variable)}</code>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  className="ml-2 text-red-600 hover:text-red-800 text-sm"
                  title="Delete variable"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Variable */}
      {!isAdding ? (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600"
        >
          + Add Variable
        </button>
      ) : (
        <div className="border-2 border-blue-500 rounded-md p-3 bg-blue-50">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">New Variable</h4>

          <div className="space-y-2">
            <input
              type="text"
              value={newVariable.name}
              onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Variable name (e.g., user_name, max_tokens)"
            />

            <input
              type="text"
              value={newVariable.defaultValue || ''}
              onChange={(e) => setNewVariable({ ...newVariable, defaultValue: e.target.value })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Default value (optional)"
            />

            <input
              type="text"
              value={newVariable.description || ''}
              onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Description (optional)"
            />

            <label className="flex items-center text-xs text-gray-700">
              <input
                type="checkbox"
                checked={newVariable.required}
                onChange={(e) => setNewVariable({ ...newVariable, required: e.target.checked })}
                className="mr-1"
              />
              Required variable
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAdd}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setNewVariable({
                    name: '',
                    defaultValue: '',
                    required: true,
                    description: '',
                  });
                }}
                className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {variables.length === 0 && !isAdding && (
        <p className="text-sm text-gray-500 text-center py-4">
          No variables defined. Use <code className="bg-gray-100 px-1 rounded">{'{{'}</code> syntax in your prompt
          text or add variables manually.
        </p>
      )}
    </div>
  );
}
