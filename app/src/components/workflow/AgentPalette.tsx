import { useState, useEffect, useRef } from 'react';
import type { AgentRole } from '@/types/workflow';
import { getAgentTemplate } from '@/lib/workflow/agentTemplates';
import { agentRegistry } from '@/lib/workflow/agentRegistry';
import { parseAgentMarkdown, validateAgent } from '@/lib/workflow/customAgents';
import type { CustomAgent } from '@/lib/workflow/customAgents';

/**
 * Agent Palette - Drag-and-drop sidebar for adding agents to workflow
 * Features:
 * - 11 built-in agent types organized by category
 * - Custom agents from .md files and Prompt Library
 * - Drag-and-drop to canvas
 * - Visual grouping by function
 * - Agent management (add, delete)
 */

const AGENT_CATEGORIES = {
  coordination: ['orchestrator', 'architect'] as AgentRole[],
  quality: ['critic', 'red-team', 'tester'] as AgentRole[],
  content: ['researcher', 'writer'] as AgentRole[],
  execution: ['coder', 'worker', 'finalizer'] as AgentRole[],
  control: ['loop'] as AgentRole[],
};

const ROLE_ICONS: Record<AgentRole, string> = {
  orchestrator: '🎭',
  architect: '🏗️',
  critic: '🔍',
  'red-team': '⚔️',
  researcher: '📚',
  coder: '💻',
  tester: '🧪',
  writer: '✍️',
  worker: '🛠️',
  finalizer: '✅',
  loop: '🔄',
};

export function AgentPalette() {
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([]);
  const [showCustomSection, setShowCustomSection] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load custom agents from registry
  useEffect(() => {
    const loadCustomAgents = () => {
      const agents = agentRegistry.getCustomAgents();
      setCustomAgents(agents);
      setShowCustomSection(agents.length > 0);
    };

    loadCustomAgents();

    // Subscribe to registry changes
    const unsubscribe = agentRegistry.subscribe(loadCustomAgents);
    return unsubscribe;
  }, []);

  const handleDragStart = (event: React.DragEvent, agentId: string) => {
    event.dataTransfer.setData('application/reactflow', agentId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);

    for (const file of Array.from(files)) {
      if (!file.name.endsWith('.md')) {
        setUploadError(`Skipped ${file.name}: Only .md files are supported`);
        continue;
      }

      try {
        const content = await file.text();
        const agent = parseAgentMarkdown(content, file.name);

        // Validate
        const validation = validateAgent(agent);
        if (!validation.valid) {
          setUploadError(`${file.name}: ${validation.errors.join(', ')}`);
          continue;
        }

        // Add to registry
        await agentRegistry.addCustomAgent(agent);
      } catch (error) {
        setUploadError(`Failed to load ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportFromLibrary = async () => {
    setImporting(true);
    setUploadError(null);

    try {
      const count = await agentRegistry.importFromPromptLibrary();
      if (count === 0) {
        setUploadError('No prompts found in library. Create prompts first.');
      }
    } catch (error) {
      setUploadError(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteCustomAgent = async (id: string) => {
    if (confirm('Delete this custom agent? This cannot be undone.')) {
      try {
        await agentRegistry.deleteCustomAgent(id);
      } catch (error) {
        setUploadError(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const renderAgentButton = (role: AgentRole) => {
    const template = getAgentTemplate(role);
    const icon = ROLE_ICONS[role];

    return (
      <div
        key={role}
        draggable
        onDragStart={(e) => handleDragStart(e, template.id)}
        className="
          w-full p-3 text-left rounded-lg border-2 border-gray-300
          bg-white hover:bg-gray-50 hover:border-blue-400
          cursor-grab active:cursor-grabbing
          transition-all duration-200
          group
        "
        title={`Drag to add ${template.name} to canvas`}
      >
        <div className="flex items-start gap-2">
          <span className="text-xl leading-none">{icon}</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-gray-900 truncate">
              {template.name}
            </div>
            <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
              {template.description}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCustomAgentButton = (agent: CustomAgent) => {
    const sourceIcon = agent.source === 'file' ? '📄' : agent.source === 'prompt-library' ? '📚' : '👤';

    return (
      <div
        key={agent.id}
        className="
          w-full p-3 text-left rounded-lg border-2 border-purple-300
          bg-purple-50 hover:bg-purple-100 hover:border-purple-400
          transition-all duration-200
          group relative
        "
      >
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, agent.id)}
          className="cursor-grab active:cursor-grabbing"
          title={`Drag to add ${agent.name} to canvas`}
        >
          <div className="flex items-start gap-2">
            <span className="text-xl leading-none">{sourceIcon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-gray-900 truncate">
                {agent.name}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                {agent.description}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {agent.source === 'file' && 'From file'}
                {agent.source === 'prompt-library' && 'From library'}
                {agent.source === 'user' && 'Custom'}
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => handleDeleteCustomAgent(agent.id)}
          className="
            absolute top-2 right-2 opacity-0 group-hover:opacity-100
            text-red-600 hover:text-red-800 text-xs
            transition-opacity
          "
          title="Delete custom agent"
        >
          ✕
        </button>
      </div>
    );
  };

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Agent Palette</h2>
        <p className="text-xs text-gray-500 mb-3">
          Drag agents to canvas to add them
        </p>

        {/* Add Custom Agents Section */}
        <div className="mb-4 space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".md"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="
              w-full px-3 py-2 text-sm font-medium
              bg-purple-600 hover:bg-purple-700 text-white rounded-lg
              transition-colors flex items-center justify-center gap-2
            "
          >
            <span>📄</span>
            <span>Upload .md Files</span>
          </button>
          <button
            onClick={handleImportFromLibrary}
            disabled={importing}
            className="
              w-full px-3 py-2 text-sm font-medium
              bg-blue-600 hover:bg-blue-700 text-white rounded-lg
              transition-colors flex items-center justify-center gap-2
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <span>📚</span>
            <span>{importing ? 'Importing...' : 'Import from Library'}</span>
          </button>
        </div>

        {/* Error Display */}
        {uploadError && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {uploadError}
            <button
              onClick={() => setUploadError(null)}
              className="ml-2 text-red-800 hover:text-red-900 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Custom Agents Section */}
        {showCustomSection && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Custom Agents ({customAgents.length})
              </h3>
              {customAgents.length > 0 && (
                <button
                  onClick={() => setShowCustomSection(!showCustomSection)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  {showCustomSection ? '▼' : '▶'}
                </button>
              )}
            </div>
            <div className="space-y-2">
              {customAgents.map(renderCustomAgentButton)}
            </div>
          </div>
        )}

        <div className="mb-4 border-t border-gray-300 pt-4">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Built-in Agents
          </h3>
        </div>

        {/* Coordination Agents */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Coordination
          </h3>
          <div className="space-y-2">
            {AGENT_CATEGORIES.coordination.map(renderAgentButton)}
          </div>
        </div>

        {/* Quality Agents */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Quality Assurance
          </h3>
          <div className="space-y-2">
            {AGENT_CATEGORIES.quality.map(renderAgentButton)}
          </div>
        </div>

        {/* Content Agents */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Content Creation
          </h3>
          <div className="space-y-2">
            {AGENT_CATEGORIES.content.map(renderAgentButton)}
          </div>
        </div>

        {/* Execution Agents */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Execution
          </h3>
          <div className="space-y-2">
            {AGENT_CATEGORIES.execution.map(renderAgentButton)}
          </div>
        </div>

        {/* Control Flow */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Control Flow
          </h3>
          <div className="space-y-2">
            {AGENT_CATEGORIES.control.map(renderAgentButton)}
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-800">
            <strong>Tip:</strong> Start with an <strong>Orchestrator</strong> for complex workflows,
            or use specialized agents for focused tasks.
          </p>
        </div>
      </div>
    </div>
  );
}
