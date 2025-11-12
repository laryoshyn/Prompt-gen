import { usePromptStore } from '@/store/promptStore';
import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { promptFormSchemaPartial } from '@/lib/validation/promptSchema';
import type { PromptFormData } from '@/types/prompt';
import { VariableEditor } from '@/components/form/VariableEditor';
import { parseVariablesFromPrompt } from '@/lib/variables/parser';
import { PromptLibrary } from '@/components/library/PromptLibrary';
import { TemplateSelector } from '@/components/library/TemplateSelector';

export function FormPanel() {
  const { currentPrompt, createNewPrompt, updateField, setCurrentPrompt } = usePromptStore();
  const [expandedSections, setExpandedSections] = useState({
    core: true,
    modes: true,
    content: true,
    examples: false,
    optional: false,
    variables: false,
  });
  const [showLibrary, setShowLibrary] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Initialize React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    setValue,
  } = useForm<PromptFormData>({
    resolver: zodResolver(promptFormSchemaPartial),
    defaultValues: currentPrompt || undefined,
  });

  // Initialize prompt on mount
  useEffect(() => {
    if (!currentPrompt) {
      createNewPrompt();
    }
  }, [currentPrompt, createNewPrompt]);

  // Reset form when currentPrompt changes
  useEffect(() => {
    if (currentPrompt) {
      reset(currentPrompt);
    }
  }, [currentPrompt, reset]);

  // Watch all form fields and sync to Zustand store
  useEffect(() => {
    const subscription = watch((formData) => {
      if (currentPrompt && formData) {
        // Update Zustand store with form changes
        setCurrentPrompt({
          ...currentPrompt,
          ...formData,
          updatedAt: Date.now(),
        } as PromptFormData);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, currentPrompt, setCurrentPrompt]);

  // Auto-detect variables from all text fields
  const detectedVariables = useMemo(() => {
    if (!currentPrompt) return [];
    return parseVariablesFromPrompt(currentPrompt);
  }, [
    currentPrompt?.objective,
    currentPrompt?.taskScope,
    currentPrompt?.inputsSummary,
    currentPrompt?.constraints,
    currentPrompt?.outputFormat,
    currentPrompt?.styleTone,
    currentPrompt?.lengthLimits,
    currentPrompt?.evaluationBar,
    currentPrompt?.risksToAvoid,
    currentPrompt?.examplesPositive,
    currentPrompt?.examplesNegative,
    currentPrompt?.toolset,
    currentPrompt?.evaluationMetrics,
    currentPrompt?.reusabilityNeeds,
    currentPrompt?.citationsPolicy,
    currentPrompt?.environmentLimits,
  ]);

  if (!currentPrompt) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Helper to render error messages
  const ErrorMessage = ({ fieldName }: { fieldName: keyof PromptFormData }) => {
    const error = errors[fieldName];
    return error ? (
      <p className="mt-1 text-xs text-red-600">{error.message as string}</p>
    ) : null;
  };

  const handleLoadPrompt = (prompt: PromptFormData) => {
    setCurrentPrompt(prompt);
    reset(prompt);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">Prompt Builder</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowLibrary(true)}
              className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              📚 Library
            </button>
            <button
              onClick={() => setShowTemplates(true)}
              className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              📋 Templates
            </button>
            <button
              onClick={createNewPrompt}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              ➕ New
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          Create production-grade prompts for Claude, GPT-4o, and Gemini
        </p>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <form className="space-y-6">
          {/* Prompt Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prompt Name *
            </label>
            <input
              type="text"
              {...register('name')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="My Awesome Prompt"
            />
            <ErrorMessage fieldName="name" />
          </div>

          {/* Core Settings Section */}
          <section className="border border-gray-200 rounded-lg">
            <button
              type="button"
              onClick={() => toggleSection('core')}
              className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 rounded-t-lg"
            >
              <h2 className="text-lg font-semibold text-gray-900">Core Settings</h2>
              <span className="text-gray-500">{expandedSections.core ? '−' : '+'}</span>
            </button>
            {expandedSections.core && (
              <div className="p-4 space-y-4">
                {/* Model Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model *
                  </label>
                  <select
                    {...register('model')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="claude-sonnet-4.5">Claude Sonnet 4.5</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gemini-2.5">Gemini 2.5</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Target LLM for prompt optimization
                  </p>
                  <ErrorMessage fieldName="model" />
                </div>

                {/* Objective */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Objective *
                  </label>
                  <textarea
                    {...register('objective')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="What should this prompt accomplish? Be specific."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Clear goal statement. Example: "Extract structured data from unstructured text"
                  </p>
                  <ErrorMessage fieldName="objective" />
                </div>

                {/* Domain */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Domain *
                  </label>
                  <input
                    type="text"
                    {...register('domain')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., software engineering, customer support, medical research"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Context domain for specialized knowledge and terminology
                  </p>
                  <ErrorMessage fieldName="domain" />
                </div>

                {/* Audience */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Audience *
                  </label>
                  <input
                    type="text"
                    {...register('audience')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., senior developers, non-technical stakeholders, students"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Who will use the output? Affects tone and detail level.
                  </p>
                  <ErrorMessage fieldName="audience" />
                </div>

                {/* Task Scope */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Scope *
                  </label>
                  <textarea
                    {...register('taskScope')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Define what's in scope and what's explicitly out of scope"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Boundaries: what to include, what to ignore, edge cases
                  </p>
                  <ErrorMessage fieldName="taskScope" />
                </div>
              </div>
            )}
          </section>

          {/* Modes Section */}
          <section className="border border-gray-200 rounded-lg">
            <button
              type="button"
              onClick={() => toggleSection('modes')}
              className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100"
            >
              <h2 className="text-lg font-semibold text-gray-900">Thinking & Agentic Modes</h2>
              <span className="text-gray-500">{expandedSections.modes ? '−' : '+'}</span>
            </button>
            {expandedSections.modes && (
              <div className="p-4 space-y-4">
                {/* Thinking Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thinking Mode *
                  </label>
                  <select
                    {...register('thinkingMode')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="minimal">Minimal - Simple, straightforward tasks</option>
                    <option value="balanced">Balanced - Standard approach (default)</option>
                    <option value="extended">Extended - Complex reasoning requiring deep analysis</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Extended thinking: 54% improvement on complex tasks (Anthropic 2025)
                  </p>
                  <ErrorMessage fieldName="thinkingMode" />
                </div>

                {/* Agentic Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agentic Mode *
                  </label>
                  <select
                    {...register('agenticMode')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="single">Single - Direct prompt execution</option>
                    <option value="delegated">Delegated - Architect → Critic → Red-Team → Finalizer</option>
                    <option value="orchestrated">Orchestrated - Multi-agent workflow patterns</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Delegated: Use for critical prompts needing review. Orchestrated: Complex workflows with planning/execution cycles.
                  </p>
                  <ErrorMessage fieldName="agenticMode" />
                </div>
              </div>
            )}
          </section>

          {/* Content Requirements Section */}
          <section className="border border-gray-200 rounded-lg">
            <button
              type="button"
              onClick={() => toggleSection('content')}
              className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100"
            >
              <h2 className="text-lg font-semibold text-gray-900">Content Requirements</h2>
              <span className="text-gray-500">{expandedSections.content ? '−' : '+'}</span>
            </button>
            {expandedSections.content && (
              <div className="p-4 space-y-4">
                {/* Inputs Summary */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inputs Summary *
                  </label>
                  <textarea
                    {...register('inputsSummary')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="What inputs will be provided? Format, structure, expected range"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Describe input types, formats, and boundaries
                  </p>
                  <ErrorMessage fieldName="inputsSummary" />
                </div>

                {/* Constraints */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Constraints *
                  </label>
                  <textarea
                    {...register('constraints')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Hard limits: Must not..., Always..., Never..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Non-negotiable rules and boundaries
                  </p>
                  <ErrorMessage fieldName="constraints" />
                </div>

                {/* Output Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Output Format *
                  </label>
                  <textarea
                    {...register('outputFormat')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="JSON schema, markdown structure, specific headings, field names..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Exact structure. Use JSON schema for structured output (100% vs 35% compliance)
                  </p>
                  <ErrorMessage fieldName="outputFormat" />
                </div>

                {/* Style & Tone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Style & Tone *
                  </label>
                  <input
                    type="text"
                    {...register('styleTone')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Professional, Conversational, Technical, Empathetic"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Writing style for the output
                  </p>
                  <ErrorMessage fieldName="styleTone" />
                </div>

                {/* Length Limits */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Length Limits *
                  </label>
                  <input
                    type="text"
                    {...register('lengthLimits')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Max 500 words, 2-3 paragraphs, <100 tokens"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Output size constraints
                  </p>
                  <ErrorMessage fieldName="lengthLimits" />
                </div>

                {/* Evaluation Bar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Evaluation Bar (Quality Standard) *
                  </label>
                  <textarea
                    {...register('evaluationBar')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="What defines success? Accuracy threshold, completeness criteria..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Measurable quality threshold
                  </p>
                  <ErrorMessage fieldName="evaluationBar" />
                </div>

                {/* Risks to Avoid */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Risks to Avoid *
                  </label>
                  <textarea
                    {...register('risksToAvoid')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Common failure modes: Hallucination, over-confidence, irrelevant info..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Anticipated problems and failure modes to guard against
                  </p>
                  <ErrorMessage fieldName="risksToAvoid" />
                </div>
              </div>
            )}
          </section>

          {/* Examples Section (Optional) */}
          <section className="border border-gray-200 rounded-lg">
            <button
              type="button"
              onClick={() => toggleSection('examples')}
              className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100"
            >
              <h2 className="text-lg font-semibold text-gray-900">Examples (Optional)</h2>
              <span className="text-gray-500">{expandedSections.examples ? '−' : '+'}</span>
            </button>
            {expandedSections.examples && (
              <div className="p-4 space-y-4">
                {/* Positive Examples */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Positive Examples (What Good Looks Like)
                  </label>
                  <textarea
                    {...register('examplesPositive')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Show 1-3 examples of ideal outputs with input context"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Few-shot examples improve performance significantly
                  </p>
                  <ErrorMessage fieldName="examplesPositive" />
                </div>

                {/* Negative Examples */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Negative Examples (What to Avoid)
                  </label>
                  <textarea
                    {...register('examplesNegative')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Show examples of bad outputs and why they're wrong"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Help the model understand failure modes
                  </p>
                  <ErrorMessage fieldName="examplesNegative" />
                </div>
              </div>
            )}
          </section>

          {/* Optional Advanced Settings */}
          <section className="border border-gray-200 rounded-lg">
            <button
              type="button"
              onClick={() => toggleSection('optional')}
              className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100"
            >
              <h2 className="text-lg font-semibold text-gray-900">Advanced Settings (Optional)</h2>
              <span className="text-gray-500">{expandedSections.optional ? '−' : '+'}</span>
            </button>
            {expandedSections.optional && (
              <div className="p-4 space-y-4">
                {/* Toolset */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Toolset (Available Tools)
                  </label>
                  <textarea
                    {...register('toolset')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="List available tools: web_search, calculator, code_execution..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Tool names and when to use them. Guide parallelization where possible.
                  </p>
                  <ErrorMessage fieldName="toolset" />
                </div>

                {/* Evaluation Metrics */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Evaluation Metrics
                  </label>
                  <textarea
                    {...register('evaluationMetrics')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Specific measurable criteria: Accuracy ≥95%, Completeness score, Latency <2s..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Quantifiable success metrics for systematic testing
                  </p>
                  <ErrorMessage fieldName="evaluationMetrics" />
                </div>

                {/* Reusability Needs */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reusability Needs
                  </label>
                  <textarea
                    {...register('reusabilityNeeds')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Will this be used as template? What should be parameterized?"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Guide variable extraction for template creation
                  </p>
                  <ErrorMessage fieldName="reusabilityNeeds" />
                </div>

                {/* Citations Policy */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Citations Policy
                  </label>
                  <input
                    type="text"
                    {...register('citationsPolicy')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Always cite sources, Include page numbers, Link to documentation"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    How to handle sources and attribution
                  </p>
                  <ErrorMessage fieldName="citationsPolicy" />
                </div>

                {/* Environment Limits */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Environment Limits
                  </label>
                  <input
                    type="text"
                    {...register('environmentLimits')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., No internet access, Limited compute, Specific API rate limits"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Runtime constraints and resource limitations
                  </p>
                  <ErrorMessage fieldName="environmentLimits" />
                </div>
              </div>
            )}
          </section>

          {/* Variables Section */}
          <section className="border border-gray-200 rounded-lg">
            <button
              type="button"
              onClick={() => toggleSection('variables')}
              className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 rounded-b-lg"
            >
              <h2 className="text-lg font-semibold text-gray-900">
                Variables
                {detectedVariables.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                    {detectedVariables.length} detected
                  </span>
                )}
              </h2>
              <span className="text-gray-500">{expandedSections.variables ? '−' : '+'}</span>
            </button>
            {expandedSections.variables && (
              <div className="p-4">
                <VariableEditor
                  variables={currentPrompt.variables}
                  onChange={(variables) => setValue('variables', variables)}
                  detectedVariables={detectedVariables}
                />
              </div>
            )}
          </section>
        </form>
      </div>

      {/* Modals */}
      {showLibrary && (
        <PromptLibrary
          onClose={() => setShowLibrary(false)}
          onLoadPrompt={handleLoadPrompt}
        />
      )}

      {showTemplates && (
        <TemplateSelector
          onClose={() => setShowTemplates(false)}
          onSelectTemplate={handleLoadPrompt}
        />
      )}
    </div>
  );
}
