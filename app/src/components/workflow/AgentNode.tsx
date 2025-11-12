import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { WorkflowNode, AgentRole } from '@/types/workflow';

/**
 * Custom React Flow node component for agent nodes
 * Features:
 * - Role-specific color coding
 * - Display agent name, role, and description
 * - Input/output handles
 * - Visual indicators for configuration (thinking mode, parallel)
 */

const ROLE_COLORS: Record<AgentRole, { bg: string; border: string; text: string }> = {
  orchestrator: {
    bg: 'bg-purple-50',
    border: 'border-purple-400',
    text: 'text-purple-800',
  },
  architect: {
    bg: 'bg-blue-50',
    border: 'border-blue-400',
    text: 'text-blue-800',
  },
  critic: {
    bg: 'bg-red-50',
    border: 'border-red-400',
    text: 'text-red-800',
  },
  'red-team': {
    bg: 'bg-orange-50',
    border: 'border-orange-400',
    text: 'text-orange-800',
  },
  researcher: {
    bg: 'bg-green-50',
    border: 'border-green-400',
    text: 'text-green-800',
  },
  coder: {
    bg: 'bg-teal-50',
    border: 'border-teal-400',
    text: 'text-teal-800',
  },
  tester: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-400',
    text: 'text-indigo-800',
  },
  writer: {
    bg: 'bg-pink-50',
    border: 'border-pink-400',
    text: 'text-pink-800',
  },
  worker: {
    bg: 'bg-gray-50',
    border: 'border-gray-400',
    text: 'text-gray-800',
  },
  finalizer: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-400',
    text: 'text-emerald-800',
  },
  loop: {
    bg: 'bg-cyan-50',
    border: 'border-cyan-400',
    text: 'text-cyan-800',
  },
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

export const AgentNode = memo(({ data, selected }: NodeProps<WorkflowNode['data']>) => {
  const colors = ROLE_COLORS[data.role];
  const icon = ROLE_ICONS[data.role];

  return (
    <div
      className={`
        nopan
        relative px-3 py-2 rounded-lg border-2 shadow-md
        min-w-[288px] max-w-[512px]
        h-[124px]
        flex flex-col
        ${colors.bg} ${colors.border}
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        transition-all duration-200 hover:shadow-lg
        bg-clip-padding
        overflow-hidden
      `}
      style={{
        backgroundColor: 'inherit',
        borderStyle: 'solid',
      }}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white"
      />

      {/* Header - Fixed height */}
      <div className="flex items-start gap-1.5 mb-1.5 flex-shrink-0">
        <span className="text-xl leading-none flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-xs ${colors.text} break-words leading-tight line-clamp-1`}>
            {data.label}
          </div>
          <div className="text-[9px] text-gray-500 capitalize leading-tight mt-0.5 font-medium">
            {data.role.replace('-', ' ')}
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 min-h-0 overflow-y-auto mb-1.5 space-y-1">
        {/* Domain */}
        {data.domain && (
          <div className="text-[9px] text-gray-800 leading-tight bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-200">
            <span className="font-semibold">Domain:</span> {data.domain}
          </div>
        )}

        {/* Description */}
        {data.description && (
          <div className="text-[9px] text-gray-700 leading-snug bg-white/50 px-1.5 py-0.5 rounded">
            {data.description}
          </div>
        )}
      </div>

      {/* Configuration Badges - Fixed at bottom */}
      <div className="flex flex-wrap gap-0.5 flex-shrink-0">
        {data.config.thinkingMode && data.config.thinkingMode !== 'balanced' && (
          <span className="px-1 py-0.5 text-[8px] bg-white rounded border border-gray-300 leading-none">
            {data.config.thinkingMode === 'extended' ? '🧠 Extended' : '⚡ Minimal'}
          </span>
        )}
        {data.config.parallel && (
          <span className="px-1 py-0.5 text-[8px] bg-white rounded border border-gray-300 leading-none">
            ⚡ Parallel
          </span>
        )}
        {data.inputs.length > 0 && (
          <span className="px-1 py-0.5 text-[8px] bg-white rounded border border-gray-300 leading-none">
            📥 {data.inputs.length}
          </span>
        )}
        {data.outputs.length > 0 && (
          <span className="px-1 py-0.5 text-[8px] bg-white rounded border border-gray-300 leading-none">
            📤 {data.outputs.length}
          </span>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
      />
    </div>
  );
});

AgentNode.displayName = 'AgentNode';
