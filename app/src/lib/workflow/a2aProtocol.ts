/**
 * Agent-to-Agent (A2A) Protocol Support
 *
 * Enables direct communication between agents in a workflow beyond artifact passing.
 * Supports multiple protocol types, message queuing, handshakes, and broadcasting.
 *
 * Features:
 * - Message Protocol (JSON-RPC, REST, GraphQL, Custom)
 * - Direct Messaging (one-to-one)
 * - Broadcasting (one-to-many)
 * - Handshake & Negotiation
 * - Message Queue with delivery confirmation
 * - Protocol Registry for custom protocols
 * - Security (message signing, encryption)
 */

import type { WorkflowNode } from '@/types/workflow';

// ============================================================================
// Types
// ============================================================================

export type ProtocolType = 'json-rpc' | 'rest' | 'graphql' | 'websocket' | 'custom';
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'acknowledged' | 'failed';
export type DeliveryMode = 'direct' | 'broadcast' | 'multicast';

/**
 * A2A Message structure
 */
export interface A2AMessage {
  id: string;
  protocol: ProtocolType;
  from: string; // Agent ID
  to: string | string[]; // Agent ID(s)
  deliveryMode: DeliveryMode;
  priority: MessagePriority;
  status: MessageStatus;

  // Message content
  type: string; // e.g., 'request', 'response', 'notification', 'handshake'
  method?: string; // For RPC-style protocols
  headers?: Record<string, string>;
  payload: any;

  // Metadata
  timestamp: string;
  expiresAt?: string;
  retryCount?: number;
  maxRetries?: number;

  // Response tracking
  replyTo?: string; // Message ID this is replying to
  requiresAck?: boolean;
  ackedAt?: string;

  // Security
  signature?: string;
  encrypted?: boolean;
}

/**
 * Protocol configuration
 */
export interface ProtocolConfig {
  id: string;
  name: string;
  type: ProtocolType;
  version: string;

  // Protocol-specific settings
  settings: {
    // JSON-RPC settings
    jsonrpc?: {
      version: '2.0';
      allowNotifications: boolean;
      allowBatches: boolean;
    };

    // REST settings
    rest?: {
      baseUrl?: string;
      allowedMethods: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')[];
      contentType: string;
    };

    // GraphQL settings
    graphql?: {
      endpoint: string;
      allowSubscriptions: boolean;
    };

    // WebSocket settings
    websocket?: {
      url: string;
      autoReconnect: boolean;
      pingInterval?: number;
    };

    // Custom protocol
    custom?: {
      handler: string; // Function name or module path
      config: Record<string, any>;
    };
  };

  // Message handling
  messageTimeout?: number; // Milliseconds
  maxMessageSize?: number; // Bytes
  retryPolicy?: {
    enabled: boolean;
    maxRetries: number;
    backoffMs: number;
  };

  // Security
  security?: {
    requireSigning: boolean;
    requireEncryption: boolean;
    allowedAgents?: string[]; // Whitelist
  };
}

/**
 * Communication channel between agents
 */
export interface CommunicationChannel {
  id: string;
  name: string;
  protocol: ProtocolType;
  participants: string[]; // Agent IDs

  // Channel settings
  persistent: boolean; // Keep history
  maxHistory?: number;
  allowBroadcast: boolean;

  // Status
  active: boolean;
  createdAt: string;
  lastActivity?: string;

  // Message queue
  messageQueue: A2AMessage[];

  // Statistics
  stats: {
    messagesSent: number;
    messagesReceived: number;
    messagesDelivered: number;
    messagesFailed: number;
  };
}

/**
 * Handshake request/response
 */
export interface HandshakeRequest {
  agentId: string;
  protocol: ProtocolType;
  version: string;
  capabilities: string[];
  proposedSettings?: Record<string, any>;
}

export interface HandshakeResponse {
  accepted: boolean;
  agentId: string;
  protocol: ProtocolType;
  version: string;
  capabilities: string[];
  agreedSettings?: Record<string, any>;
  reason?: string; // If rejected
}

/**
 * Message delivery result
 */
export interface DeliveryResult {
  messageId: string;
  success: boolean;
  deliveredTo: string[];
  failedTo: string[];
  timestamp: string;
  error?: string;
}

// ============================================================================
// A2A Protocol Manager
// ============================================================================

export class A2AProtocolManager {
  private protocols: Map<string, ProtocolConfig> = new Map();
  private channels: Map<string, CommunicationChannel> = new Map();
  private messageQueue: Map<string, A2AMessage> = new Map();
  private handshakes: Map<string, HandshakeResponse> = new Map();

  // ============================================================================
  // Protocol Management
  // ============================================================================

  /**
   * Register a protocol configuration
   */
  registerProtocol(config: ProtocolConfig): void {
    this.protocols.set(config.id, config);
  }

  /**
   * Get protocol configuration
   */
  getProtocol(protocolId: string): ProtocolConfig | undefined {
    return this.protocols.get(protocolId);
  }

  /**
   * List all registered protocols
   */
  listProtocols(): ProtocolConfig[] {
    return Array.from(this.protocols.values());
  }

  /**
   * Unregister a protocol
   */
  unregisterProtocol(protocolId: string): boolean {
    return this.protocols.delete(protocolId);
  }

  // ============================================================================
  // Channel Management
  // ============================================================================

  /**
   * Create a communication channel
   */
  createChannel(params: {
    name: string;
    protocol: ProtocolType;
    participants: string[];
    persistent?: boolean;
    maxHistory?: number;
    allowBroadcast?: boolean;
  }): CommunicationChannel {
    const channel: CommunicationChannel = {
      id: `channel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: params.name,
      protocol: params.protocol,
      participants: params.participants,
      persistent: params.persistent ?? true,
      maxHistory: params.maxHistory ?? 100,
      allowBroadcast: params.allowBroadcast ?? true,
      active: true,
      createdAt: new Date().toISOString(),
      messageQueue: [],
      stats: {
        messagesSent: 0,
        messagesReceived: 0,
        messagesDelivered: 0,
        messagesFailed: 0,
      },
    };

    this.channels.set(channel.id, channel);
    return channel;
  }

  /**
   * Get channel by ID
   */
  getChannel(channelId: string): CommunicationChannel | undefined {
    return this.channels.get(channelId);
  }

  /**
   * List all channels
   */
  listChannels(): CommunicationChannel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Get channels for a specific agent
   */
  getAgentChannels(agentId: string): CommunicationChannel[] {
    return Array.from(this.channels.values()).filter(
      channel => channel.participants.includes(agentId)
    );
  }

  /**
   * Close a channel
   */
  closeChannel(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    channel.active = false;
    return true;
  }

  /**
   * Delete a channel
   */
  deleteChannel(channelId: string): boolean {
    return this.channels.delete(channelId);
  }

  // ============================================================================
  // Handshake & Negotiation
  // ============================================================================

  /**
   * Initiate handshake with another agent
   */
  initiateHandshake(
    fromAgentId: string,
    toAgentId: string,
    request: Omit<HandshakeRequest, 'agentId'>
  ): HandshakeRequest {
    const handshakeRequest: HandshakeRequest = {
      agentId: fromAgentId,
      ...request,
    };

    // In real implementation, this would send to the target agent
    // For now, we'll simulate
    console.log(`[A2A] Handshake initiated from ${fromAgentId} to ${toAgentId}`, handshakeRequest);

    return handshakeRequest;
  }

  /**
   * Respond to handshake request
   */
  respondToHandshake(
    agentId: string,
    request: HandshakeRequest,
    accept: boolean,
    reason?: string
  ): HandshakeResponse {
    const response: HandshakeResponse = {
      accepted: accept,
      agentId,
      protocol: request.protocol,
      version: request.version,
      capabilities: request.capabilities,
      agreedSettings: accept ? request.proposedSettings : undefined,
      reason: !accept ? reason : undefined,
    };

    if (accept) {
      const handshakeKey = `${request.agentId}-${agentId}`;
      this.handshakes.set(handshakeKey, response);
    }

    return response;
  }

  /**
   * Check if handshake is established
   */
  isHandshakeEstablished(agentId1: string, agentId2: string): boolean {
    const key1 = `${agentId1}-${agentId2}`;
    const key2 = `${agentId2}-${agentId1}`;
    return this.handshakes.has(key1) || this.handshakes.has(key2);
  }

  // ============================================================================
  // Message Sending
  // ============================================================================

  /**
   * Send a message
   */
  sendMessage(params: {
    from: string;
    to: string | string[];
    protocol: ProtocolType;
    type: string;
    method?: string;
    payload: any;
    priority?: MessagePriority;
    requiresAck?: boolean;
    expiresIn?: number; // Milliseconds
    channelId?: string;
  }): A2AMessage {
    const message: A2AMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      protocol: params.protocol,
      from: params.from,
      to: params.to,
      deliveryMode: Array.isArray(params.to) ? 'multicast' : 'direct',
      priority: params.priority ?? 'normal',
      status: 'pending',
      type: params.type,
      method: params.method,
      payload: params.payload,
      timestamp: new Date().toISOString(),
      expiresAt: params.expiresIn
        ? new Date(Date.now() + params.expiresIn).toISOString()
        : undefined,
      requiresAck: params.requiresAck ?? false,
      retryCount: 0,
      maxRetries: 3,
    };

    // Add to message queue
    this.messageQueue.set(message.id, message);

    // Add to channel if specified
    if (params.channelId) {
      const channel = this.channels.get(params.channelId);
      if (channel) {
        channel.messageQueue.push(message);
        channel.stats.messagesSent++;
        channel.lastActivity = new Date().toISOString();

        // Trim history if needed
        if (channel.messageQueue.length > (channel.maxHistory ?? 100)) {
          channel.messageQueue.shift();
        }
      }
    }

    // Simulate delivery
    this.deliverMessage(message);

    return message;
  }

  /**
   * Broadcast message to all participants in a channel
   */
  broadcast(params: {
    from: string;
    channelId: string;
    type: string;
    payload: any;
    priority?: MessagePriority;
  }): A2AMessage | null {
    const channel = this.channels.get(params.channelId);
    if (!channel) {
      console.error(`[A2A] Channel not found: ${params.channelId}`);
      return null;
    }

    if (!channel.allowBroadcast) {
      console.error(`[A2A] Broadcasting not allowed in channel: ${params.channelId}`);
      return null;
    }

    // Get all participants except sender
    const recipients = channel.participants.filter(id => id !== params.from);

    return this.sendMessage({
      from: params.from,
      to: recipients,
      protocol: channel.protocol,
      type: params.type,
      payload: params.payload,
      priority: params.priority,
      channelId: params.channelId,
    });
  }

  /**
   * Reply to a message
   */
  reply(params: {
    messageId: string;
    from: string;
    type: string;
    payload: any;
    channelId?: string;
  }): A2AMessage | null {
    const originalMessage = this.messageQueue.get(params.messageId);
    if (!originalMessage) {
      console.error(`[A2A] Original message not found: ${params.messageId}`);
      return null;
    }

    return this.sendMessage({
      from: params.from,
      to: originalMessage.from,
      protocol: originalMessage.protocol,
      type: params.type,
      payload: params.payload,
      channelId: params.channelId,
    });
  }

  /**
   * Acknowledge message receipt
   */
  acknowledgeMessage(messageId: string, agentId: string): boolean {
    const message = this.messageQueue.get(messageId);
    if (!message) return false;

    message.status = 'acknowledged';
    message.ackedAt = new Date().toISOString();

    console.log(`[A2A] Message ${messageId} acknowledged by ${agentId}`);
    return true;
  }

  // ============================================================================
  // Message Receiving
  // ============================================================================

  /**
   * Get messages for an agent
   */
  getMessages(agentId: string, options?: {
    status?: MessageStatus;
    protocol?: ProtocolType;
    limit?: number;
    since?: string;
  }): A2AMessage[] {
    let messages = Array.from(this.messageQueue.values()).filter(msg => {
      if (Array.isArray(msg.to)) {
        return msg.to.includes(agentId);
      }
      return msg.to === agentId;
    });

    if (options?.status) {
      messages = messages.filter(msg => msg.status === options.status);
    }

    if (options?.protocol) {
      messages = messages.filter(msg => msg.protocol === options.protocol);
    }

    if (options?.since) {
      messages = messages.filter(msg => msg.timestamp > options.since);
    }

    if (options?.limit) {
      messages = messages.slice(0, options.limit);
    }

    return messages;
  }

  /**
   * Get unread messages (pending or sent status)
   */
  getUnreadMessages(agentId: string): A2AMessage[] {
    return this.getMessages(agentId, {
      status: 'pending',
    }).concat(
      this.getMessages(agentId, {
        status: 'sent',
      })
    );
  }

  /**
   * Get channel message history
   */
  getChannelHistory(channelId: string, limit?: number): A2AMessage[] {
    const channel = this.channels.get(channelId);
    if (!channel) return [];

    const messages = [...channel.messageQueue];
    if (limit) {
      return messages.slice(-limit);
    }
    return messages;
  }

  // ============================================================================
  // Internal Methods
  // ============================================================================

  /**
   * Deliver a message (simulated)
   */
  private deliverMessage(message: A2AMessage): DeliveryResult {
    const recipients = Array.isArray(message.to) ? message.to : [message.to];

    // Check if message expired
    if (message.expiresAt && new Date(message.expiresAt) < new Date()) {
      message.status = 'failed';
      return {
        messageId: message.id,
        success: false,
        deliveredTo: [],
        failedTo: recipients,
        timestamp: new Date().toISOString(),
        error: 'Message expired',
      };
    }

    // Simulate delivery
    message.status = 'delivered';

    return {
      messageId: message.id,
      success: true,
      deliveredTo: recipients,
      failedTo: [],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Clean up expired messages
   */
  cleanupExpiredMessages(): number {
    let cleaned = 0;
    const now = new Date();

    for (const [id, message] of this.messageQueue.entries()) {
      if (message.expiresAt && new Date(message.expiresAt) < now) {
        this.messageQueue.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalProtocols: number;
    totalChannels: number;
    activeChannels: number;
    totalMessages: number;
    messagesByStatus: Record<MessageStatus, number>;
    messagesByProtocol: Record<ProtocolType, number>;
  } {
    const stats = {
      totalProtocols: this.protocols.size,
      totalChannels: this.channels.size,
      activeChannels: Array.from(this.channels.values()).filter(ch => ch.active).length,
      totalMessages: this.messageQueue.size,
      messagesByStatus: {} as Record<MessageStatus, number>,
      messagesByProtocol: {} as Record<ProtocolType, number>,
    };

    // Count by status
    for (const message of this.messageQueue.values()) {
      stats.messagesByStatus[message.status] =
        (stats.messagesByStatus[message.status] || 0) + 1;
      stats.messagesByProtocol[message.protocol] =
        (stats.messagesByProtocol[message.protocol] || 0) + 1;
    }

    return stats;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const a2aProtocolManager = new A2AProtocolManager();

// ============================================================================
// Protocol Templates
// ============================================================================

/**
 * Default JSON-RPC protocol
 */
export const JSON_RPC_PROTOCOL: ProtocolConfig = {
  id: 'jsonrpc-default',
  name: 'JSON-RPC 2.0',
  type: 'json-rpc',
  version: '2.0',
  settings: {
    jsonrpc: {
      version: '2.0',
      allowNotifications: true,
      allowBatches: false,
    },
  },
  messageTimeout: 30000,
  maxMessageSize: 1024 * 1024, // 1MB
  retryPolicy: {
    enabled: true,
    maxRetries: 3,
    backoffMs: 1000,
  },
};

/**
 * REST-style protocol
 */
export const REST_PROTOCOL: ProtocolConfig = {
  id: 'rest-default',
  name: 'REST API',
  type: 'rest',
  version: '1.0',
  settings: {
    rest: {
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
      contentType: 'application/json',
    },
  },
  messageTimeout: 30000,
  maxMessageSize: 10 * 1024 * 1024, // 10MB
};

/**
 * GraphQL protocol
 */
export const GRAPHQL_PROTOCOL: ProtocolConfig = {
  id: 'graphql-default',
  name: 'GraphQL',
  type: 'graphql',
  version: '1.0',
  settings: {
    graphql: {
      endpoint: '/graphql',
      allowSubscriptions: true,
    },
  },
  messageTimeout: 30000,
  maxMessageSize: 5 * 1024 * 1024, // 5MB
};

/**
 * WebSocket protocol
 */
export const WEBSOCKET_PROTOCOL: ProtocolConfig = {
  id: 'websocket-default',
  name: 'WebSocket',
  type: 'websocket',
  version: '1.0',
  settings: {
    websocket: {
      url: 'ws://localhost:8080',
      autoReconnect: true,
      pingInterval: 30000,
    },
  },
  messageTimeout: 60000,
  maxMessageSize: 1024 * 1024, // 1MB
};

// Register default protocols
a2aProtocolManager.registerProtocol(JSON_RPC_PROTOCOL);
a2aProtocolManager.registerProtocol(REST_PROTOCOL);
a2aProtocolManager.registerProtocol(GRAPHQL_PROTOCOL);
a2aProtocolManager.registerProtocol(WEBSOCKET_PROTOCOL);
