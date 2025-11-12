import type { AgentRole } from '@/types/workflow';
import { getAgentTemplate } from '@/lib/workflow/agentTemplates';

/**
 * Agent Palette - Drag-and-drop sidebar for adding agents to workflow
 * Features:
 * - 10 agent types organized by category
 * - Drag-and-drop to canvas
 * - Visual grouping by function
 * - Descriptions and use cases
 */

interface AgentPaletteProps {
  // Removed onAddAgent - only drag-and-drop is supported
}

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
  const handleDragStart = (event: React.DragEvent, role: AgentRole) => {
    event.dataTransfer.setData('application/reactflow', role);
    event.dataTransfer.effectAllowed = 'move';
  };

  const renderAgentButton = (role: AgentRole) => {
    const template = getAgentTemplate(role);
    const icon = ROLE_ICONS[role];

    return (
      <div
        key={role}
        draggable
        onDragStart={(e) => handleDragStart(e, role)}
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

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Agent Palette</h2>
        <p className="text-xs text-gray-500 mb-4">
          Drag agents to canvas to add them
        </p>

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
