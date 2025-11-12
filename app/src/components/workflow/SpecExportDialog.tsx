/**
 * Spec Export Dialog
 * Export workflows in multiple industry-standard formats
 * V2: Support for YAML, Markdown, and ZIP exports
 */

import { useState } from 'react';
import JSZip from 'jszip';
import type { WorkflowGraph } from '@/types/workflow';
import { specExportEngineV2, type ExportFormat, type ExportResult } from '@/lib/workflow/specExportV2';

interface SpecExportDialogProps {
  workflow: WorkflowGraph;
  onClose: () => void;
}

export function SpecExportDialog({ workflow, onClose }: SpecExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('standard-json');
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Define available formats grouped by category
  const formats = [
    // EXECUTION PROMPTS
    { id: 'execution-sequential', name: 'Sequential Prompt', extension: 'md', category: 'Execution', description: 'Sequential chain execution prompt for Claude' },
    { id: 'execution-orchestrator', name: 'Orchestrator Prompt', extension: 'md', category: 'Execution', description: 'Orchestrator mode execution prompt for Claude' },
    { id: 'execution-state-machine', name: 'State Machine Prompt', extension: 'md', category: 'Execution', description: 'State machine execution prompt for Claude' },
    { id: 'execution-parallel', name: 'Parallel Prompt', extension: 'md', category: 'Execution', description: 'Parallel execution prompt for Claude' },

    // SPECIFICATIONS
    { id: 'openspec', name: 'OpenSpec', extension: 'md', category: 'Specification', description: 'Human-readable workflow specification' },
    { id: 'claude-code', name: 'Claude Code', extension: 'zip', category: 'Specification', description: 'Agent files (.claude/agents/*.md)' },

    // FRAMEWORK INTEGRATIONS
    { id: 'crewai', name: 'CrewAI', extension: 'zip', category: 'Framework', description: 'YAML config + Python code' },
    { id: 'langgraph', name: 'LangGraph', extension: 'json', category: 'Framework', description: 'StateGraph JSON' },
    { id: 'autogen', name: 'AutoGen', extension: 'json', category: 'Framework', description: 'Conversation config JSON' },
    { id: 'temporal', name: 'Temporal', extension: 'json', category: 'Framework', description: 'Workflow definition JSON' },
    { id: 'n8n', name: 'n8n', extension: 'json', category: 'Framework', description: 'n8n workflow automation JSON' },

    // STANDARD FORMATS
    { id: 'standard-yaml', name: 'Standard YAML', extension: 'yaml', category: 'Standard', description: 'Complete workflow YAML' },
    { id: 'standard-json', name: 'Standard JSON', extension: 'json', category: 'Standard', description: 'Complete workflow JSON' },
  ] as const;

  const handleExport = async () => {
    try {
      const result = specExportEngineV2.export(workflow, selectedFormat);

      // For ZIP exports, generate the ZIP file
      if (result.format === 'zip' && result.files) {
        const zip = new JSZip();
        Object.entries(result.files).forEach(([path, content]) => {
          zip.file(path, content);
        });
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        setExportResult({ ...result, content: zipBlob });
      } else {
        setExportResult(result);
      }

      setShowPreview(true);
    } catch (error) {
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDownload = () => {
    if (!exportResult) return;

    let blob: Blob;
    if (exportResult.content instanceof Blob) {
      blob = exportResult.content;
    } else {
      const mimeType = exportResult.mimeType || 'text/plain';
      blob = new Blob([exportResult.content], { type: mimeType });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!exportResult) return;

    try {
      if (exportResult.content instanceof Blob) {
        alert('Cannot copy ZIP files to clipboard. Please use Download instead.');
        return;
      }
      await navigator.clipboard.writeText(exportResult.content);
      alert('Copied to clipboard!');
    } catch (error) {
      alert('Failed to copy to clipboard');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Export Workflow: {workflow.name}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Export as execution prompts, specifications, or framework integrations
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!showPreview ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Select Export Format
                </label>

                {/* Group formats by category */}
                {['Execution', 'Specification', 'Framework', 'Standard'].map((category) => {
                  const categoryFormats = formats.filter(f => f.category === category);
                  if (categoryFormats.length === 0) return null;

                  return (
                    <div key={category} className="mb-6">
                      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        {category === 'Execution' && '⚡ '}
                        {category === 'Specification' && '📄 '}
                        {category === 'Framework' && '🔧 '}
                        {category === 'Standard' && '📦 '}
                        {category}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {categoryFormats.map((format) => (
                          <button
                            key={format.id}
                            onClick={() => setSelectedFormat(format.id as ExportFormat)}
                            className={`p-4 text-left rounded-lg border-2 transition-all ${
                              selectedFormat === format.id
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                {format.name}
                              </h3>
                              <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                                .{format.extension}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {format.description}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Format details */}
              {selectedFormat && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    About {formats.find(f => f.id === selectedFormat)?.name}
                  </h4>
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    {selectedFormat === 'execution-sequential' && (
                      <>
                        <p>• Sequential chain execution pattern</p>
                        <p>• Agents execute in order, passing artifacts forward</p>
                        <p>• Copy and paste into Claude to execute workflow</p>
                      </>
                    )}
                    {selectedFormat === 'execution-orchestrator' && (
                      <>
                        <p>• Central orchestrator coordinates all agents</p>
                        <p>• Orchestrator delegates tasks and aggregates results</p>
                        <p>• Best for complex workflows with dependencies</p>
                      </>
                    )}
                    {selectedFormat === 'execution-state-machine' && (
                      <>
                        <p>• State-based workflow execution</p>
                        <p>• Conditional transitions between agents</p>
                        <p>• Supports loops and branching logic</p>
                      </>
                    )}
                    {selectedFormat === 'execution-parallel' && (
                      <>
                        <p>• Parallel execution of independent agents</p>
                        <p>• Fork-join pattern with result aggregation</p>
                        <p>• Best for tasks that can run concurrently</p>
                      </>
                    )}
                    {selectedFormat === 'openspec' && (
                      <>
                        <p>• Deterministic and reviewable workflow definitions</p>
                        <p>• Includes intents, agents, steps, and artifacts</p>
                        <p>• Human-readable documentation format</p>
                      </>
                    )}
                    {selectedFormat === 'standard-json' && (
                      <>
                        <p>• Generic workflow representation</p>
                        <p>• Easy to parse and modify</p>
                        <p>• Can be imported back into Prompt-Gen</p>
                      </>
                    )}
                    {selectedFormat === 'standard-yaml' && (
                      <>
                        <p>• Complete workflow with all edge properties</p>
                        <p>• Includes Tier 1-3 edge configurations</p>
                        <p>• Human-readable alternative to JSON</p>
                      </>
                    )}
                    {selectedFormat === 'claude-code' && (
                      <>
                        <p>• Compatible with Claude Code (.claude/agents/)</p>
                        <p>• Includes orchestrator if applicable</p>
                        <p>• Ready to use with Task tool delegation</p>
                      </>
                    )}
                    {selectedFormat === 'langgraph' && (
                      <>
                        <p>• StateGraph format with Python code generation</p>
                        <p>• Includes checkpointing configuration</p>
                        <p>• Compatible with LangGraph v0.2.0+</p>
                      </>
                    )}
                    {selectedFormat === 'crewai' && (
                      <>
                        <p>• Crew/Flow format with Python code generation</p>
                        <p>• Includes agents, tasks, and process configuration</p>
                        <p>• Compatible with CrewAI v0.11.0+</p>
                      </>
                    )}
                    {selectedFormat === 'autogen' && (
                      <>
                        <p>• AutoGen conversation configuration</p>
                        <p>• Includes agent roles and conversation flow</p>
                        <p>• Compatible with AutoGen v0.4.0+</p>
                      </>
                    )}
                    {selectedFormat === 'temporal' && (
                      <>
                        <p>• Temporal workflow definition</p>
                        <p>• Includes activities and retry policies</p>
                        <p>• Compatible with Temporal v1.0+</p>
                      </>
                    )}
                    {selectedFormat === 'n8n' && (
                      <>
                        <p>• n8n workflow automation format</p>
                        <p>• Nodes with AI agent configurations</p>
                        <p>• Import directly into n8n v1.0+</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Export Preview
                  </h3>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    ← Back to format selection
                  </button>
                </div>

                {exportResult && exportResult.content instanceof Blob ? (
                  // ZIP file preview
                  <div className="p-8 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                    <div className="text-4xl mb-4">📦</div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      ZIP Archive Ready
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                      This export contains multiple files. Click Download to save the ZIP file.
                    </p>
                    {exportResult.files && (
                      <div className="text-left max-w-md mx-auto">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Files included:
                        </p>
                        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                          {Object.keys(exportResult.files).map((path) => (
                            <li key={path} className="font-mono">
                              📄 {path}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  // Text preview (JSON, YAML, Markdown)
                  <div className="relative">
                    <pre className="p-4 bg-gray-900 dark:bg-gray-950 text-gray-100 rounded-lg overflow-x-auto text-xs font-mono max-h-[500px] overflow-y-auto">
                      {exportResult?.content as string}
                    </pre>
                    <button
                      onClick={handleCopy}
                      className="absolute top-2 right-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                    >
                      Copy
                    </button>
                  </div>
                )}
              </div>

              {/* Export info */}
              {exportResult && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <div>
                      <span className="font-medium">Format:</span>{' '}
                      {formats.find((f) => f.id === selectedFormat)?.name}
                    </div>
                    <div>
                      <span className="font-medium">Type:</span> {exportResult.format.toUpperCase()}
                    </div>
                    <div>
                      <span className="font-medium">Size:</span>{' '}
                      {exportResult.content instanceof Blob
                        ? exportResult.content.size.toLocaleString()
                        : new Blob([exportResult.content]).size.toLocaleString()}{' '}
                      bytes
                    </div>
                    <div>
                      <span className="font-medium">Filename:</span> {exportResult.filename}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            {showPreview ? (
              <>
                <button
                  onClick={handleDownload}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                  Download File
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleExport}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                  Generate Export
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
