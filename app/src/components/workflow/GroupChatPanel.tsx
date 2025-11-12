/**
 * Group Chat Panel
 * UI for managing group chat orchestration
 */

import { useState } from 'react';
import type {
  GroupChatConfig,
  GroupChatParticipant,
  SpeakerSelectionStrategy,
  TerminationCondition,
  GroupChatMessage,
} from '@/lib/workflow/groupChat';
import { groupChatManager, GROUP_CHAT_TEMPLATES } from '@/lib/workflow/groupChat';

interface GroupChatPanelProps {
  availableAgents: Array<{ id: string; label: string; role: string }>;
  onClose?: () => void;
}

export function GroupChatPanel({ availableAgents, onClose }: GroupChatPanelProps) {
  const [viewMode, setViewMode] = useState<'create' | 'list' | 'details'>('list');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // Create form state
  const [chatName, setChatName] = useState('');
  const [description, setDescription] = useState('');
  const [selectionStrategy, setSelectionStrategy] = useState<SpeakerSelectionStrategy>('round-robin');
  const [maxRounds, setMaxRounds] = useState<number>(20);
  const [participants, setParticipants] = useState<Array<Omit<GroupChatParticipant, 'messagesSent' | 'consecutiveTurns'>>>([]);
  const [terminationConditions, setTerminationConditions] = useState<TerminationCondition[]>([
    { type: 'max-messages', maxMessages: 30 },
  ]);

  const [showTemplates, setShowTemplates] = useState(false);

  const handleCreateChat = () => {
    if (!chatName || participants.length < 2) {
      alert('Please provide a name and at least 2 participants');
      return;
    }

    const chat = groupChatManager.createGroupChat({
      name: chatName,
      description,
      participants,
      selectionStrategy,
      terminationConditions,
      maxRounds,
    });

    setViewMode('list');
    setChatName('');
    setDescription('');
    setParticipants([]);
  };

  const handleUseTemplate = (templateKey: keyof typeof GROUP_CHAT_TEMPLATES) => {
    const template = GROUP_CHAT_TEMPLATES[templateKey];
    setChatName(template.name);
    setDescription(template.description);
    setSelectionStrategy(template.selectionStrategy);
    setTerminationConditions(template.terminationConditions);
    setParticipants(template.participants);
    setShowTemplates(false);
  };

  const handleAddParticipant = () => {
    if (availableAgents.length === 0) {
      alert('No agents available');
      return;
    }

    setParticipants([
      ...participants,
      {
        id: `participant-${Date.now()}`,
        agentId: '',
        name: '',
        role: '',
        capabilities: [],
        canInitiate: false,
        canTerminate: false,
        maxConsecutiveTurns: 2,
      },
    ]);
  };

  const handleUpdateParticipant = (index: number, field: string, value: any) => {
    const updated = [...participants];
    (updated[index] as any)[field] = value;

    // Auto-fill name and role from selected agent
    if (field === 'agentId' && value) {
      const agent = availableAgents.find(a => a.id === value);
      if (agent) {
        updated[index].name = agent.label;
        updated[index].role = agent.role;
      }
    }

    setParticipants(updated);
  };

  const handleRemoveParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleAddTerminationCondition = () => {
    setTerminationConditions([
      ...terminationConditions,
      { type: 'max-messages', maxMessages: 30 },
    ]);
  };

  const handleUpdateTerminationCondition = (index: number, updates: Partial<TerminationCondition>) => {
    const updated = [...terminationConditions];
    updated[index] = { ...updated[index], ...updates };
    setTerminationConditions(updated);
  };

  const handleRemoveTerminationCondition = (index: number) => {
    setTerminationConditions(terminationConditions.filter((_, i) => i !== index));
  };

  const handleViewDetails = (chatId: string) => {
    setSelectedChatId(chatId);
    setViewMode('details');
  };

  const renderCreateView = () => (
    <div className="space-y-4">
      {/* Templates */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
          Create Group Chat
        </h4>
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {showTemplates ? 'Hide Templates' : 'Use Template'}
        </button>
      </div>

      {showTemplates && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded space-y-2">
          {Object.entries(GROUP_CHAT_TEMPLATES).map(([key, template]) => (
            <button
              key={key}
              onClick={() => handleUseTemplate(key as keyof typeof GROUP_CHAT_TEMPLATES)}
              className="w-full p-3 text-left bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 hover:border-blue-500"
            >
              <div className="font-medium text-sm text-gray-900 dark:text-white">
                {template.name}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {template.description}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Basic info */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Chat Name *
        </label>
        <input
          type="text"
          value={chatName}
          onChange={(e) => setChatName(e.target.value)}
          placeholder="e.g., Code Review Discussion"
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
          placeholder="Describe the purpose of this group chat..."
          rows={2}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Selection strategy */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Speaker Selection Strategy
        </label>
        <select
          value={selectionStrategy}
          onChange={(e) => setSelectionStrategy(e.target.value as SpeakerSelectionStrategy)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="round-robin">Round Robin</option>
          <option value="random">Random</option>
          <option value="reply-chain">Reply Chain (mentions)</option>
          <option value="capability-match">Capability Match</option>
          <option value="load-balanced">Load Balanced</option>
        </select>
      </div>

      {/* Participants */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Participants (min 2) *
          </label>
          <button
            onClick={handleAddParticipant}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            + Add Participant
          </button>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {participants.map((participant, index) => (
            <div
              key={index}
              className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
            >
              <div className="grid grid-cols-2 gap-2 mb-2">
                <select
                  value={participant.agentId}
                  onChange={(e) => handleUpdateParticipant(index, 'agentId', e.target.value)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select agent...</option>
                  {availableAgents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.label}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={participant.name}
                  onChange={(e) => handleUpdateParticipant(index, 'name', e.target.value)}
                  placeholder="Display name"
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 mb-2">
                <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={participant.canInitiate}
                    onChange={(e) => handleUpdateParticipant(index, 'canInitiate', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Can Initiate
                </label>
                <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={participant.canTerminate}
                    onChange={(e) => handleUpdateParticipant(index, 'canTerminate', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Can Terminate
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Max turns:</span>
                  <input
                    type="number"
                    value={participant.maxConsecutiveTurns}
                    onChange={(e) => handleUpdateParticipant(index, 'maxConsecutiveTurns', Number(e.target.value))}
                    min="1"
                    max="10"
                    className="w-12 px-1 py-0.5 text-xs border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={participant.capabilities.join(', ')}
                  onChange={(e) => handleUpdateParticipant(
                    index,
                    'capabilities',
                    e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  )}
                  placeholder="Capabilities (comma-separated)"
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={() => handleRemoveParticipant(index)}
                  className="px-2 py-1.5 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100 dark:bg-red-900/20"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {participants.length === 0 && (
            <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
              No participants added yet. Click "Add Participant" to start.
            </div>
          )}
        </div>
      </div>

      {/* Termination conditions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Termination Conditions
          </label>
          <button
            onClick={handleAddTerminationCondition}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            + Add Condition
          </button>
        </div>

        <div className="space-y-2">
          {terminationConditions.map((condition, index) => (
            <div
              key={index}
              className="p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
            >
              <div className="flex gap-2">
                <select
                  value={condition.type}
                  onChange={(e) => handleUpdateTerminationCondition(index, { type: e.target.value as any })}
                  className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="max-messages">Max Messages</option>
                  <option value="keyword">Keyword</option>
                  <option value="agent-decision">Agent Decision</option>
                  <option value="timeout">Timeout</option>
                  <option value="goal-achieved">Goal Achieved</option>
                </select>

                {condition.type === 'max-messages' && (
                  <input
                    type="number"
                    value={condition.maxMessages || 30}
                    onChange={(e) => handleUpdateTerminationCondition(index, { maxMessages: Number(e.target.value) })}
                    min="5"
                    max="100"
                    className="w-20 px-2 py-1.5 text-xs border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                )}

                {condition.type === 'keyword' && (
                  <input
                    type="text"
                    value={condition.keywords?.join(', ') || ''}
                    onChange={(e) => handleUpdateTerminationCondition(index, {
                      keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="Keywords (comma-separated)"
                    className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                )}

                {condition.type === 'timeout' && (
                  <input
                    type="number"
                    value={condition.timeoutMs || 60000}
                    onChange={(e) => handleUpdateTerminationCondition(index, { timeoutMs: Number(e.target.value) })}
                    min="5000"
                    max="600000"
                    step="5000"
                    placeholder="ms"
                    className="w-24 px-2 py-1.5 text-xs border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                )}

                <button
                  onClick={() => handleRemoveTerminationCondition(index)}
                  className="px-2 py-1.5 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100 dark:bg-red-900/20"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleCreateChat}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          Create Group Chat
        </button>
        <button
          onClick={() => setViewMode('list')}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  const renderListView = () => {
    // In production, would list actual chats from state
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Group Chats
          </h4>
          <button
            onClick={() => setViewMode('create')}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            + Create Chat
          </button>
        </div>

        <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
          No group chats created yet. Click "Create Chat" to start.
        </div>
      </div>
    );
  };

  const renderDetailsView = () => {
    if (!selectedChatId) return null;

    const chat = groupChatManager.getGroupChat(selectedChatId);
    if (!chat) return <div>Chat not found</div>;

    const stats = groupChatManager.getParticipantStats(selectedChatId);
    const history = groupChatManager.getConversationHistory(selectedChatId);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              {chat.name}
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {chat.description}
            </p>
          </div>
          <button
            onClick={() => setViewMode('list')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-xs text-gray-600 dark:text-gray-400">Messages</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {history.length}
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-xs text-gray-600 dark:text-gray-400">Participants</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {chat.participants.length}
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-xs text-gray-600 dark:text-gray-400">Status</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
              {chat.status}
            </div>
          </div>
        </div>

        {/* Participant stats */}
        <div>
          <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Participant Statistics
          </h5>
          <div className="space-y-2">
            {stats.map(stat => (
              <div
                key={stat.participant.id}
                className="p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {stat.participant.name}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {stat.messagesSent} messages
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message history */}
        <div>
          <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Conversation History
          </h5>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {history.map(msg => (
              <div
                key={msg.id}
                className="p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-900 dark:text-white">
                    {msg.speakerId}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {msg.content}
                </p>
              </div>
            ))}

            {history.length === 0 && (
              <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                No messages yet
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Group Chat Orchestration
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {viewMode === 'create' && renderCreateView()}
      {viewMode === 'list' && renderListView()}
      {viewMode === 'details' && renderDetailsView()}
    </div>
  );
}
