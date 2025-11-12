import { useState } from 'react';
import { useWorkflowStore } from '@/store/workflowStore';
import type {
  ProtocolType,
  ProtocolConfig,
  CommunicationChannel,
  A2AMessage,
  MessagePriority,
} from '@/lib/workflow/a2aProtocol';

/**
 * A2A Protocol Panel
 *
 * Manage Agent-to-Agent communication protocols, channels, and messages.
 *
 * Features:
 * - Create and manage communication channels
 * - Send direct messages and broadcasts
 * - View message history
 * - Configure protocol settings
 * - Monitor communication stats
 */

interface A2AProtocolPanelProps {
  availableAgents: Array<{ id: string; label: string; role: string }>;
  onClose: () => void;
}

type ViewMode = 'channels' | 'messages' | 'protocols' | 'create-channel' | 'send-message';

export function A2AProtocolPanel({ availableAgents, onClose }: A2AProtocolPanelProps) {
  const {
    listA2AChannels,
    createA2AChannel,
    getA2AChannelHistory,
    sendA2AMessage,
    broadcastA2AMessage,
    getA2AMessages,
    acknowledgeA2AMessage,
    getA2AStats,
    listA2AProtocols,
  } = useWorkflowStore();

  const [viewMode, setViewMode] = useState<ViewMode>('channels');
  const [selectedChannel, setSelectedChannel] = useState<CommunicationChannel | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>('');

  // Create channel form
  const [channelName, setChannelName] = useState('');
  const [channelProtocol, setChannelProtocol] = useState<ProtocolType>('json-rpc');
  const [channelParticipants, setChannelParticipants] = useState<string[]>([]);
  const [allowBroadcast, setAllowBroadcast] = useState(true);
  const [persistent, setPersistent] = useState(true);
  const [maxHistory, setMaxHistory] = useState(100);

  // Send message form
  const [messageFrom, setMessageFrom] = useState('');
  const [messageTo, setMessageTo] = useState<string[]>([]);
  const [messageType, setMessageType] = useState('request');
  const [messageMethod, setMessageMethod] = useState('');
  const [messagePayload, setMessagePayload] = useState('{\n  \n}');
  const [messagePriority, setMessagePriority] = useState<MessagePriority>('normal');
  const [requiresAck, setRequiresAck] = useState(false);

  const channels = listA2AChannels();
  const stats = getA2AStats();
  const protocols = listA2AProtocols();

  const handleCreateChannel = () => {
    if (!channelName || channelParticipants.length < 2) {
      alert('Please provide channel name and at least 2 participants');
      return;
    }

    createA2AChannel({
      name: channelName,
      protocol: channelProtocol,
      participants: channelParticipants,
      persistent,
      maxHistory,
      allowBroadcast,
    });

    // Reset form
    setChannelName('');
    setChannelParticipants([]);
    setViewMode('channels');
  };

  const handleSendMessage = () => {
    if (!messageFrom || messageTo.length === 0 || !messagePayload) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const payload = JSON.parse(messagePayload);

      sendA2AMessage({
        from: messageFrom,
        to: messageTo.length === 1 ? messageTo[0] : messageTo,
        protocol: channelProtocol,
        type: messageType,
        method: messageMethod || undefined,
        payload,
        priority: messagePriority,
        requiresAck,
        channelId: selectedChannel?.id,
      });

      // Reset form
      setMessagePayload('{\n  \n}');
      setViewMode('messages');
    } catch (error) {
      alert('Invalid JSON payload');
    }
  };

  const handleBroadcast = () => {
    if (!selectedChannel || !messageFrom) {
      alert('Please select a channel and sender');
      return;
    }

    try {
      const payload = JSON.parse(messagePayload);

      broadcastA2AMessage({
        from: messageFrom,
        channelId: selectedChannel.id,
        type: messageType,
        payload,
        priority: messagePriority,
      });

      setMessagePayload('{\n  \n}');
      setViewMode('messages');
    } catch (error) {
      alert('Invalid JSON payload');
    }
  };

  const toggleParticipant = (agentId: string) => {
    if (channelParticipants.includes(agentId)) {
      setChannelParticipants(channelParticipants.filter(id => id !== agentId));
    } else {
      setChannelParticipants([...channelParticipants, agentId]);
    }
  };

  const toggleRecipient = (agentId: string) => {
    if (messageTo.includes(agentId)) {
      setMessageTo(messageTo.filter(id => id !== agentId));
    } else {
      setMessageTo([...messageTo, agentId]);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50">
        <div>
          <h2 className="text-xl font-bold text-gray-900">🔗 A2A Protocol Manager</h2>
          <p className="text-sm text-gray-600 mt-1">
            Agent-to-Agent Communication Channels
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Close
        </button>
      </div>

      {/* Navigation */}
      <div className="flex border-b border-gray-200 bg-gray-50 px-6">
        <button
          onClick={() => setViewMode('channels')}
          className={`px-4 py-3 text-sm font-medium border-b-2 ${
            viewMode === 'channels' || viewMode === 'create-channel'
              ? 'border-purple-500 text-purple-700'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          📡 Channels ({channels.length})
        </button>
        <button
          onClick={() => setViewMode('messages')}
          className={`px-4 py-3 text-sm font-medium border-b-2 ${
            viewMode === 'messages' || viewMode === 'send-message'
              ? 'border-purple-500 text-purple-700'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          💬 Messages ({stats.totalMessages})
        </button>
        <button
          onClick={() => setViewMode('protocols')}
          className={`px-4 py-3 text-sm font-medium border-b-2 ${
            viewMode === 'protocols'
              ? 'border-purple-500 text-purple-700'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          ⚙️ Protocols ({stats.totalProtocols})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Channels View */}
        {viewMode === 'channels' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Communication Channels</h3>
              <button
                onClick={() => setViewMode('create-channel')}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                + Create Channel
              </button>
            </div>

            {channels.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg mb-2">No channels created yet</p>
                <p className="text-sm">Create a channel to enable agent communication</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {channels.map(channel => (
                  <div
                    key={channel.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 cursor-pointer"
                    onClick={() => {
                      setSelectedChannel(channel);
                      setViewMode('messages');
                    }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{channel.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {channel.protocol.toUpperCase()} • {channel.participants.length} participants
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          channel.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {channel.active ? '● Active' : '○ Inactive'}
                      </span>
                    </div>

                    <div className="flex gap-4 text-xs text-gray-600">
                      <span>📨 {channel.stats.messagesSent} sent</span>
                      <span>📥 {channel.stats.messagesReceived} received</span>
                      <span>✅ {channel.stats.messagesDelivered} delivered</span>
                      {channel.stats.messagesFailed > 0 && (
                        <span className="text-red-600">❌ {channel.stats.messagesFailed} failed</span>
                      )}
                    </div>

                    {channel.lastActivity && (
                      <p className="text-xs text-gray-500 mt-2">
                        Last activity: {new Date(channel.lastActivity).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Channel View */}
        {viewMode === 'create-channel' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Create Communication Channel</h3>
              <button
                onClick={() => setViewMode('channels')}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                ← Back
              </button>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Channel Name</label>
              <input
                type="text"
                value={channelName}
                onChange={e => setChannelName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., Code Review Channel"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Protocol</label>
              <select
                value={channelProtocol}
                onChange={e => setChannelProtocol(e.target.value as ProtocolType)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="json-rpc">JSON-RPC 2.0</option>
                <option value="rest">REST API</option>
                <option value="graphql">GraphQL</option>
                <option value="websocket">WebSocket</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Participants (select at least 2)
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-gray-200 rounded p-3">
                {availableAgents.map(agent => (
                  <label key={agent.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={channelParticipants.includes(agent.id)}
                      onChange={() => toggleParticipant(agent.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">{agent.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Selected: {channelParticipants.length} agents
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={persistent}
                    onChange={e => setPersistent(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-semibold text-gray-700">Persistent (keep history)</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowBroadcast}
                    onChange={e => setAllowBroadcast(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-semibold text-gray-700">Allow Broadcast</span>
                </label>
              </div>
            </div>

            {persistent && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Max History (messages)
                </label>
                <input
                  type="number"
                  value={maxHistory}
                  onChange={e => setMaxHistory(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  min={10}
                  max={1000}
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCreateChannel}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Create Channel
              </button>
              <button
                onClick={() => setViewMode('channels')}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Messages View */}
        {viewMode === 'messages' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedChannel ? `Messages in ${selectedChannel.name}` : 'All Messages'}
              </h3>
              <div className="flex gap-2">
                {selectedChannel && (
                  <button
                    onClick={() => setSelectedChannel(null)}
                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Show All
                  </button>
                )}
                <button
                  onClick={() => setViewMode('send-message')}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  + Send Message
                </button>
              </div>
            </div>

            {selectedAgent && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3 flex justify-between items-center">
                <span className="text-sm text-blue-800">
                  Viewing messages for: <strong>{availableAgents.find(a => a.id === selectedAgent)?.label}</strong>
                </span>
                <button
                  onClick={() => setSelectedAgent('')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear filter
                </button>
              </div>
            )}

            <div className="space-y-3">
              {(() => {
                const messages = selectedChannel
                  ? getA2AChannelHistory(selectedChannel.id, 50)
                  : selectedAgent
                  ? getA2AMessages(selectedAgent, { limit: 50 })
                  : [];

                if (messages.length === 0) {
                  return (
                    <div className="text-center py-12 text-gray-500">
                      <p className="text-lg mb-2">No messages yet</p>
                      <p className="text-sm">Send a message to start communication</p>
                    </div>
                  );
                }

                return messages.map(message => (
                  <div
                    key={message.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-purple-300"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-sm font-semibold text-gray-900">
                          From: {availableAgents.find(a => a.id === message.from)?.label || message.from}
                        </span>
                        <span className="text-sm text-gray-500 mx-2">→</span>
                        <span className="text-sm text-gray-700">
                          To: {Array.isArray(message.to)
                            ? `${message.to.length} recipients`
                            : availableAgents.find(a => a.id === message.to)?.label || message.to
                          }
                        </span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            message.status === 'delivered'
                              ? 'bg-green-100 text-green-700'
                              : message.status === 'acknowledged'
                              ? 'bg-blue-100 text-blue-700'
                              : message.status === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {message.status}
                        </span>
                        <span className="text-xs text-gray-500">{message.protocol}</span>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded p-3 mb-2">
                      <p className="text-xs text-gray-600 mb-1">
                        Type: <strong>{message.type}</strong>
                        {message.method && ` • Method: ${message.method}`}
                      </p>
                      <pre className="text-xs text-gray-800 overflow-x-auto">
                        {JSON.stringify(message.payload, null, 2)}
                      </pre>
                    </div>

                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{new Date(message.timestamp).toLocaleString()}</span>
                      <div className="flex gap-2">
                        {message.priority !== 'normal' && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                            {message.priority} priority
                          </span>
                        )}
                        {message.requiresAck && !message.ackedAt && (
                          <button
                            onClick={() => acknowledgeA2AMessage(message.id, selectedAgent)}
                            className="px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Acknowledge
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Send Message View */}
        {viewMode === 'send-message' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Send Message</h3>
              <button
                onClick={() => setViewMode('messages')}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                ← Back
              </button>
            </div>

            {selectedChannel && (
              <div className="bg-purple-50 border border-purple-200 rounded p-3">
                <span className="text-sm text-purple-800">
                  Sending in channel: <strong>{selectedChannel.name}</strong>
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">From (Sender)</label>
                <select
                  value={messageFrom}
                  onChange={e => setMessageFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select sender...</option>
                  {availableAgents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Message Type</label>
                <select
                  value={messageType}
                  onChange={e => setMessageType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="request">Request</option>
                  <option value="response">Response</option>
                  <option value="notification">Notification</option>
                  <option value="handshake">Handshake</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                To (Recipients - select one or more)
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded p-3">
                {availableAgents
                  .filter(agent => agent.id !== messageFrom)
                  .map(agent => (
                    <label key={agent.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={messageTo.includes(agent.id)}
                        onChange={() => toggleRecipient(agent.id)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">{agent.label}</span>
                    </label>
                  ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Selected: {messageTo.length} recipients</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Method (optional)</label>
                <input
                  type="text"
                  value={messageMethod}
                  onChange={e => setMessageMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., getStatus, updateState"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                <select
                  value={messagePriority}
                  onChange={e => setMessagePriority(e.target.value as MessagePriority)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Payload (JSON)</label>
              <textarea
                value={messagePayload}
                onChange={e => setMessagePayload(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                placeholder='{"key": "value"}'
              />
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresAck}
                  onChange={e => setRequiresAck(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-semibold text-gray-700">Requires Acknowledgment</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSendMessage}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Send Message
              </button>
              {selectedChannel && selectedChannel.allowBroadcast && (
                <button
                  onClick={handleBroadcast}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Broadcast to All
                </button>
              )}
              <button
                onClick={() => setViewMode('messages')}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Protocols View */}
        {viewMode === 'protocols' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Registered Protocols</h3>

            <div className="grid gap-4">
              {protocols.map(protocol => (
                <div key={protocol.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{protocol.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {protocol.type.toUpperCase()} v{protocol.version}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                      Active
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                    {protocol.messageTimeout && (
                      <span>⏱️ Timeout: {protocol.messageTimeout / 1000}s</span>
                    )}
                    {protocol.maxMessageSize && (
                      <span>📦 Max size: {(protocol.maxMessageSize / 1024).toFixed(0)}KB</span>
                    )}
                    {protocol.retryPolicy && (
                      <span>🔄 Max retries: {protocol.retryPolicy.maxRetries}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-4 gap-4 text-center text-sm">
          <div>
            <p className="text-gray-600">Channels</p>
            <p className="text-lg font-semibold text-gray-900">{stats.totalChannels}</p>
          </div>
          <div>
            <p className="text-gray-600">Active</p>
            <p className="text-lg font-semibold text-green-600">{stats.activeChannels}</p>
          </div>
          <div>
            <p className="text-gray-600">Messages</p>
            <p className="text-lg font-semibold text-gray-900">{stats.totalMessages}</p>
          </div>
          <div>
            <p className="text-gray-600">Protocols</p>
            <p className="text-lg font-semibold text-gray-900">{stats.totalProtocols}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
