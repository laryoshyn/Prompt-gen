import { useState } from 'react';
import { GUIDE_TEMPLATES, getCategories, applyTemplate, type TemplateDefinition } from '@/lib/templates/guideTemplates';
import type { PromptFormData } from '@/types/prompt';

interface TemplateSelectorProps {
  onClose: () => void;
  onSelectTemplate: (prompt: PromptFormData) => void;
}

export function TemplateSelector({ onClose, onSelectTemplate }: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDefinition | null>(null);

  const categories = getCategories();

  const filteredTemplates = selectedCategory === 'all'
    ? GUIDE_TEMPLATES
    : GUIDE_TEMPLATES.filter(t => t.category === selectedCategory);

  const handleUseTemplate = () => {
    if (!selectedTemplate) return;

    const prompt = applyTemplate(selectedTemplate);
    onSelectTemplate(prompt);
    onClose();
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      data: 'Data Processing',
      code: 'Code & Development',
      research: 'Research & Analysis',
      agents: 'Multi-Agent Systems',
      general: 'General Purpose',
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      data: 'bg-blue-100 text-blue-800',
      code: 'bg-green-100 text-green-800',
      research: 'bg-purple-100 text-purple-800',
      agents: 'bg-orange-100 text-orange-800',
      general: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Template Library</h2>
              <p className="text-sm text-gray-500 mt-1">
                Pre-built templates from PROMPT-GENERATION-GUIDE.md
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Close
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All Templates ({GUIDE_TEMPLATES.length})
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {getCategoryLabel(category)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Template List */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
            <div className="divide-y divide-gray-200">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${
                    selectedTemplate?.id === template.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded ${getCategoryColor(template.category)}`}>
                          {getCategoryLabel(template.category)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="w-1/2 overflow-y-auto p-6">
            {selectedTemplate ? (
              <div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900">{selectedTemplate.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedTemplate.description}</p>
                  <span className={`inline-block mt-2 px-2 py-0.5 text-xs rounded ${getCategoryColor(selectedTemplate.category)}`}>
                    {getCategoryLabel(selectedTemplate.category)}
                  </span>
                </div>

                <div className="space-y-4 text-sm">
                  {selectedTemplate.content.objective && (
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Objective</label>
                      <p className="text-gray-600">{selectedTemplate.content.objective}</p>
                    </div>
                  )}

                  {selectedTemplate.content.domain && (
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Domain</label>
                      <p className="text-gray-600">{selectedTemplate.content.domain}</p>
                    </div>
                  )}

                  {selectedTemplate.content.audience && (
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Audience</label>
                      <p className="text-gray-600">{selectedTemplate.content.audience}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {selectedTemplate.content.thinkingMode && (
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Thinking Mode</label>
                        <p className="text-gray-600">{selectedTemplate.content.thinkingMode}</p>
                      </div>
                    )}

                    {selectedTemplate.content.agenticMode && (
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Agentic Mode</label>
                        <p className="text-gray-600">{selectedTemplate.content.agenticMode}</p>
                      </div>
                    )}
                  </div>

                  {selectedTemplate.content.constraints && (
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Constraints</label>
                      <pre className="text-gray-600 whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded">
                        {selectedTemplate.content.constraints}
                      </pre>
                    </div>
                  )}

                  {selectedTemplate.content.outputFormat && (
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Output Format</label>
                      <pre className="text-gray-600 whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded">
                        {selectedTemplate.content.outputFormat}
                      </pre>
                    </div>
                  )}

                  {selectedTemplate.content.risksToAvoid && (
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Risks to Avoid</label>
                      <pre className="text-gray-600 whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded">
                        {selectedTemplate.content.risksToAvoid}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleUseTemplate}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
                  >
                    Use This Template
                  </button>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    This will replace your current form with the template content
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Select a template to see details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
