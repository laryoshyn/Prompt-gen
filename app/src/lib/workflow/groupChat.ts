/**
 * Group Chat Orchestration Pattern
 * Dynamic multi-agent collaboration with speaker selection
 *
 * Inspired by AutoGen GroupChat and multi-agent conversation frameworks
 *
 * Pattern: Multiple agents collaborate in a shared conversation space with
 * intelligent speaker selection, turn-taking, and termination conditions.
 */

import type { WorkflowState } from '@/types/workflow';

/**
 * Speaker selection strategy
 */
export type SpeakerSelectionStrategy =
  | 'round-robin' // Take turns in order
  | 'random' // Random selection
  | 'manual' // User selects speaker
  | 'auto' // LLM-based speaker selection
  | 'reply-chain' // Agent replies to mentions
  | 'capability-match' // Select by capability
  | 'load-balanced'; // Balance by workload

/**
 * Message in group chat
 */
export interface GroupChatMessage {
  id: string;
  timestamp: number;
  speakerId: string; // Agent ID
  content: string;
  role: 'user' | 'assistant' | 'system';

  // Metadata
  replyTo?: string; // Message ID
  mentionedAgents?: string[]; // Agent IDs mentioned
  artifacts?: string[]; // Artifact URIs referenced

  // Execution
  executionTimeMs?: number;
  tokensUsed?: number;
}

/**
 * Group chat participant
 */
export interface GroupChatParticipant {
  id: string;
  agentId: string; // Reference to agent node
  name: string;
  role: string;

  // Capabilities
  capabilities: string[];
  systemMessage?: string; // Agent-specific system prompt

  // Participation rules
  canInitiate: boolean; // Can start conversation
  canTerminate: boolean; // Can end conversation
  maxConsecutiveTurns: number; // Max times can speak in row

  // State
  messagesSent: number;
  lastMessageTimestamp?: number;
  consecutiveTurns: number;
}

/**
 * Termination condition
 */
export interface TerminationCondition {
  type:
    | 'max-messages' // Reached message limit
    | 'keyword' // Specific keyword detected
    | 'agent-decision' // Agent decides to terminate
    | 'timeout' // Time limit exceeded
    | 'consensus' // All agents agree
    | 'goal-achieved' // Specific goal condition met
    | 'custom'; // Custom JavaScript expression

  // Configuration
  maxMessages?: number;
  keywords?: string[]; // Terminate if any present
  timeoutMs?: number;
  goalCondition?: string; // JavaScript expression
  customExpression?: string;
}

/**
 * Speaker selection context
 */
export interface SpeakerSelectionContext {
  currentSpeaker: string | null;
  lastNMessages: GroupChatMessage[];
  participants: GroupChatParticipant[];
  conversationState: WorkflowState;

  // Selection history
  selectionHistory: Array<{
    speakerId: string;
    timestamp: number;
    reason: string;
  }>;
}

/**
 * Group chat configuration
 */
export interface GroupChatConfig {
  id: string;
  name: string;
  description?: string;

  // Participants
  participants: GroupChatParticipant[];

  // Selection
  selectionStrategy: SpeakerSelectionStrategy;
  allowSelfSelection: boolean; // Can agent select self?
  requireExplicitSelection: boolean; // Require explicit next speaker

  // Termination
  terminationConditions: TerminationCondition[];
  maxRounds?: number; // Max conversation rounds
  timeoutMs?: number;

  // Conversation
  conversationHistory: GroupChatMessage[];
  currentRound: number;

  // Context management
  maxHistoryLength: number; // Messages to keep in context
  summarizeAfterN?: number; // Summarize after N messages

  // Metadata
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  status: 'initialized' | 'active' | 'completed' | 'terminated';
}

/**
 * Speaker selection result
 */
export interface SpeakerSelectionResult {
  nextSpeakerId: string;
  reason: string;
  confidence?: number; // 0-1 for auto selection
  alternatives?: Array<{
    speakerId: string;
    score: number;
    reason: string;
  }>;
}

/**
 * Group Chat Manager
 */
export class GroupChatManager {
  private chats: Map<string, GroupChatConfig>;
  private selectionHandlers: Map<SpeakerSelectionStrategy, (context: SpeakerSelectionContext) => SpeakerSelectionResult>;

  constructor() {
    this.chats = new Map();
    this.selectionHandlers = new Map();

    // Register built-in selection strategies
    this.registerSelectionStrategy('round-robin', this.roundRobinSelection.bind(this));
    this.registerSelectionStrategy('random', this.randomSelection.bind(this));
    this.registerSelectionStrategy('reply-chain', this.replyChainSelection.bind(this));
    this.registerSelectionStrategy('capability-match', this.capabilityMatchSelection.bind(this));
    this.registerSelectionStrategy('load-balanced', this.loadBalancedSelection.bind(this));
  }

  /**
   * Create group chat
   */
  createGroupChat(params: {
    name: string;
    description?: string;
    participants: Omit<GroupChatParticipant, 'messagesSent' | 'consecutiveTurns'>[];
    selectionStrategy?: SpeakerSelectionStrategy;
    terminationConditions?: TerminationCondition[];
    maxRounds?: number;
    maxHistoryLength?: number;
  }): GroupChatConfig {
    const chat: GroupChatConfig = {
      id: `group-chat-${Date.now()}`,
      name: params.name,
      description: params.description,
      participants: params.participants.map(p => ({
        ...p,
        messagesSent: 0,
        consecutiveTurns: 0,
      })),
      selectionStrategy: params.selectionStrategy || 'round-robin',
      allowSelfSelection: false,
      requireExplicitSelection: false,
      terminationConditions: params.terminationConditions || [
        { type: 'max-messages', maxMessages: 50 },
      ],
      maxRounds: params.maxRounds,
      conversationHistory: [],
      currentRound: 0,
      maxHistoryLength: params.maxHistoryLength || 100,
      createdAt: Date.now(),
      status: 'initialized',
    };

    this.chats.set(chat.id, chat);
    return chat;
  }

  /**
   * Start group chat
   */
  startGroupChat(chatId: string, initialMessage?: string): void {
    const chat = this.chats.get(chatId);
    if (!chat) {
      throw new Error(`Group chat not found: ${chatId}`);
    }

    chat.status = 'active';
    chat.startedAt = Date.now();

    // Add initial message if provided
    if (initialMessage) {
      const systemMessage: GroupChatMessage = {
        id: `msg-${Date.now()}`,
        timestamp: Date.now(),
        speakerId: 'system',
        content: initialMessage,
        role: 'system',
      };
      chat.conversationHistory.push(systemMessage);
    }
  }

  /**
   * Add message to group chat
   */
  addMessage(chatId: string, message: Omit<GroupChatMessage, 'id' | 'timestamp'>): GroupChatMessage {
    const chat = this.chats.get(chatId);
    if (!chat) {
      throw new Error(`Group chat not found: ${chatId}`);
    }

    const fullMessage: GroupChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    chat.conversationHistory.push(fullMessage);

    // Update participant state
    const participant = chat.participants.find(p => p.agentId === message.speakerId);
    if (participant) {
      participant.messagesSent++;
      participant.lastMessageTimestamp = fullMessage.timestamp;

      // Update consecutive turns
      const lastSpeaker = this.getLastSpeaker(chat);
      if (lastSpeaker === participant.agentId) {
        participant.consecutiveTurns++;
      } else {
        // Reset all consecutive turns
        chat.participants.forEach(p => {
          if (p.agentId === participant.agentId) {
            p.consecutiveTurns = 1;
          } else {
            p.consecutiveTurns = 0;
          }
        });
      }
    }

    // Trim history if needed
    if (chat.conversationHistory.length > chat.maxHistoryLength) {
      chat.conversationHistory = chat.conversationHistory.slice(-chat.maxHistoryLength);
    }

    return fullMessage;
  }

  /**
   * Select next speaker
   */
  selectNextSpeaker(chatId: string, state?: WorkflowState): SpeakerSelectionResult {
    const chat = this.chats.get(chatId);
    if (!chat) {
      throw new Error(`Group chat not found: ${chatId}`);
    }

    const context: SpeakerSelectionContext = {
      currentSpeaker: this.getLastSpeaker(chat),
      lastNMessages: chat.conversationHistory.slice(-10),
      participants: chat.participants,
      conversationState: state || ({} as WorkflowState),
      selectionHistory: chat.conversationHistory.map(msg => ({
        speakerId: msg.speakerId,
        timestamp: msg.timestamp,
        reason: 'message',
      })),
    };

    const handler = this.selectionHandlers.get(chat.selectionStrategy);
    if (!handler) {
      throw new Error(`Unknown selection strategy: ${chat.selectionStrategy}`);
    }

    const result = handler(context);

    // Validate selection
    const selectedParticipant = chat.participants.find(p => p.agentId === result.nextSpeakerId);
    if (!selectedParticipant) {
      throw new Error(`Selected speaker not found: ${result.nextSpeakerId}`);
    }

    // Check consecutive turns limit
    if (selectedParticipant.consecutiveTurns >= selectedParticipant.maxConsecutiveTurns) {
      // Find alternative
      const alternatives = chat.participants
        .filter(p => p.agentId !== result.nextSpeakerId && p.consecutiveTurns < p.maxConsecutiveTurns)
        .sort((a, b) => a.consecutiveTurns - b.consecutiveTurns);

      if (alternatives.length > 0) {
        return {
          nextSpeakerId: alternatives[0].agentId,
          reason: `${selectedParticipant.name} reached max consecutive turns (${selectedParticipant.maxConsecutiveTurns}), selecting alternative`,
        };
      }
    }

    return result;
  }

  /**
   * Check termination conditions
   */
  shouldTerminate(chatId: string, state?: WorkflowState): {
    shouldTerminate: boolean;
    reason?: string;
    condition?: TerminationCondition;
  } {
    const chat = this.chats.get(chatId);
    if (!chat) {
      throw new Error(`Group chat not found: ${chatId}`);
    }

    for (const condition of chat.terminationConditions) {
      const result = this.evaluateTerminationCondition(chat, condition, state);
      if (result.shouldTerminate) {
        return result;
      }
    }

    return { shouldTerminate: false };
  }

  /**
   * Evaluate termination condition
   */
  private evaluateTerminationCondition(
    chat: GroupChatConfig,
    condition: TerminationCondition,
    state?: WorkflowState
  ): { shouldTerminate: boolean; reason?: string; condition?: TerminationCondition } {
    switch (condition.type) {
      case 'max-messages':
        if (condition.maxMessages && chat.conversationHistory.length >= condition.maxMessages) {
          return {
            shouldTerminate: true,
            reason: `Reached max messages (${condition.maxMessages})`,
            condition,
          };
        }
        break;

      case 'keyword':
        if (condition.keywords) {
          const lastMessage = chat.conversationHistory[chat.conversationHistory.length - 1];
          if (lastMessage && condition.keywords.some(kw => lastMessage.content.toLowerCase().includes(kw.toLowerCase()))) {
            return {
              shouldTerminate: true,
              reason: `Keyword detected: ${condition.keywords.join(', ')}`,
              condition,
            };
          }
        }
        break;

      case 'timeout':
        if (condition.timeoutMs && chat.startedAt) {
          const elapsed = Date.now() - chat.startedAt;
          if (elapsed >= condition.timeoutMs) {
            return {
              shouldTerminate: true,
              reason: `Timeout exceeded (${condition.timeoutMs}ms)`,
              condition,
            };
          }
        }
        break;

      case 'agent-decision':
        // Check if any message contains termination signal
        const lastMessage = chat.conversationHistory[chat.conversationHistory.length - 1];
        if (lastMessage && (
          lastMessage.content.toLowerCase().includes('terminate') ||
          lastMessage.content.toLowerCase().includes('conversation complete')
        )) {
          const participant = chat.participants.find(p => p.agentId === lastMessage.speakerId);
          if (participant?.canTerminate) {
            return {
              shouldTerminate: true,
              reason: `Agent ${participant.name} decided to terminate`,
              condition,
            };
          }
        }
        break;

      case 'goal-achieved':
        if (condition.goalCondition && state) {
          try {
            const result = new Function('state', `return ${condition.goalCondition}`)(state);
            if (result) {
              return {
                shouldTerminate: true,
                reason: `Goal achieved: ${condition.goalCondition}`,
                condition,
              };
            }
          } catch (error) {
            console.error('Error evaluating goal condition:', error);
          }
        }
        break;

      case 'custom':
        if (condition.customExpression && state) {
          try {
            const result = new Function('chat', 'state', `return ${condition.customExpression}`)(chat, state);
            if (result) {
              return {
                shouldTerminate: true,
                reason: `Custom condition met: ${condition.customExpression}`,
                condition,
              };
            }
          } catch (error) {
            console.error('Error evaluating custom condition:', error);
          }
        }
        break;
    }

    return { shouldTerminate: false };
  }

  /**
   * Terminate group chat
   */
  terminateGroupChat(chatId: string, reason: string): void {
    const chat = this.chats.get(chatId);
    if (!chat) {
      throw new Error(`Group chat not found: ${chatId}`);
    }

    chat.status = 'terminated';
    chat.completedAt = Date.now();

    // Add termination message
    this.addMessage(chatId, {
      speakerId: 'system',
      content: `Group chat terminated: ${reason}`,
      role: 'system',
    });
  }

  /**
   * Get group chat
   */
  getGroupChat(chatId: string): GroupChatConfig | null {
    return this.chats.get(chatId) || null;
  }

  /**
   * Get conversation history
   */
  getConversationHistory(chatId: string, lastN?: number): GroupChatMessage[] {
    const chat = this.chats.get(chatId);
    if (!chat) return [];

    if (lastN) {
      return chat.conversationHistory.slice(-lastN);
    }
    return chat.conversationHistory;
  }

  /**
   * Get participant stats
   */
  getParticipantStats(chatId: string): Array<{
    participant: GroupChatParticipant;
    messagesSent: number;
    avgResponseTimeMs: number;
    totalTokensUsed: number;
  }> {
    const chat = this.chats.get(chatId);
    if (!chat) return [];

    return chat.participants.map(participant => {
      const messages = chat.conversationHistory.filter(m => m.speakerId === participant.agentId);
      const avgResponseTime = messages.length > 0
        ? messages.reduce((sum, m) => sum + (m.executionTimeMs || 0), 0) / messages.length
        : 0;
      const totalTokens = messages.reduce((sum, m) => sum + (m.tokensUsed || 0), 0);

      return {
        participant,
        messagesSent: messages.length,
        avgResponseTimeMs: avgResponseTime,
        totalTokensUsed: totalTokens,
      };
    });
  }

  // ===== SELECTION STRATEGIES =====

  /**
   * Register custom selection strategy
   */
  registerSelectionStrategy(
    strategy: SpeakerSelectionStrategy,
    handler: (context: SpeakerSelectionContext) => SpeakerSelectionResult
  ): void {
    this.selectionHandlers.set(strategy, handler);
  }

  /**
   * Round-robin selection
   */
  private roundRobinSelection(context: SpeakerSelectionContext): SpeakerSelectionResult {
    if (!context.currentSpeaker) {
      return {
        nextSpeakerId: context.participants[0].agentId,
        reason: 'First speaker in round-robin',
      };
    }

    const currentIndex = context.participants.findIndex(p => p.agentId === context.currentSpeaker);
    const nextIndex = (currentIndex + 1) % context.participants.length;

    return {
      nextSpeakerId: context.participants[nextIndex].agentId,
      reason: `Round-robin: next in sequence`,
    };
  }

  /**
   * Random selection
   */
  private randomSelection(context: SpeakerSelectionContext): SpeakerSelectionResult {
    const eligibleParticipants = context.participants.filter(
      p => p.agentId !== context.currentSpeaker
    );

    if (eligibleParticipants.length === 0) {
      return {
        nextSpeakerId: context.participants[0].agentId,
        reason: 'Only participant available',
      };
    }

    const selected = eligibleParticipants[Math.floor(Math.random() * eligibleParticipants.length)];
    return {
      nextSpeakerId: selected.agentId,
      reason: 'Random selection',
    };
  }

  /**
   * Reply chain selection (agent replies to mentions)
   */
  private replyChainSelection(context: SpeakerSelectionContext): SpeakerSelectionResult {
    const lastMessage = context.lastNMessages[context.lastNMessages.length - 1];

    if (lastMessage?.mentionedAgents && lastMessage.mentionedAgents.length > 0) {
      // Select first mentioned agent
      const mentioned = lastMessage.mentionedAgents[0];
      const participant = context.participants.find(p => p.agentId === mentioned);

      if (participant) {
        return {
          nextSpeakerId: mentioned,
          reason: `Mentioned in previous message`,
        };
      }
    }

    // Fallback to round-robin
    return this.roundRobinSelection(context);
  }

  /**
   * Capability match selection
   */
  private capabilityMatchSelection(context: SpeakerSelectionContext): SpeakerSelectionResult {
    const lastMessage = context.lastNMessages[context.lastNMessages.length - 1];

    if (!lastMessage) {
      return this.roundRobinSelection(context);
    }

    // Extract keywords from message (simple word extraction)
    const keywords = lastMessage.content.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    // Score participants by capability match
    const scores = context.participants.map(participant => {
      const matchCount = participant.capabilities.filter(cap =>
        keywords.some(kw => cap.toLowerCase().includes(kw) || kw.includes(cap.toLowerCase()))
      ).length;

      return {
        participant,
        score: matchCount,
      };
    });

    scores.sort((a, b) => b.score - a.score);

    if (scores[0].score > 0) {
      return {
        nextSpeakerId: scores[0].participant.agentId,
        reason: `Best capability match (score: ${scores[0].score})`,
        confidence: scores[0].score / context.participants.length,
        alternatives: scores.slice(1, 3).map(s => ({
          speakerId: s.participant.agentId,
          score: s.score,
          reason: 'Alternative capability match',
        })),
      };
    }

    // No match, fallback
    return this.roundRobinSelection(context);
  }

  /**
   * Load-balanced selection
   */
  private loadBalancedSelection(context: SpeakerSelectionContext): SpeakerSelectionResult {
    // Select participant with least messages sent
    const sorted = [...context.participants].sort((a, b) => a.messagesSent - b.messagesSent);

    return {
      nextSpeakerId: sorted[0].agentId,
      reason: `Load balanced: least messages sent (${sorted[0].messagesSent})`,
    };
  }

  // ===== HELPERS =====

  /**
   * Get last speaker
   */
  private getLastSpeaker(chat: GroupChatConfig): string | null {
    const lastMessage = chat.conversationHistory[chat.conversationHistory.length - 1];
    return lastMessage?.speakerId || null;
  }

  /**
   * Generate conversation summary
   */
  async generateSummary(chatId: string): Promise<string> {
    const chat = this.chats.get(chatId);
    if (!chat) {
      throw new Error(`Group chat not found: ${chatId}`);
    }

    // Simple summary (in production, would use LLM)
    const participantNames = chat.participants.map(p => p.name).join(', ');
    const messageCount = chat.conversationHistory.length;
    const duration = chat.completedAt
      ? chat.completedAt - (chat.startedAt || chat.createdAt)
      : Date.now() - (chat.startedAt || chat.createdAt);

    return `Group chat "${chat.name}" with ${chat.participants.length} participants (${participantNames}). ${messageCount} messages exchanged over ${Math.round(duration / 1000)}s.`;
  }
}

/**
 * Singleton instance
 */
export const groupChatManager = new GroupChatManager();

/**
 * Common group chat templates
 */
export const GROUP_CHAT_TEMPLATES = {
  /**
   * Code review conversation
   */
  CODE_REVIEW: {
    name: 'Code Review Discussion',
    description: 'Multiple reviewers discuss code changes',
    participants: [
      {
        agentId: 'architect',
        name: 'Architect',
        role: 'architect',
        capabilities: ['architecture', 'design', 'patterns'],
        canInitiate: true,
        canTerminate: false,
        maxConsecutiveTurns: 2,
      },
      {
        agentId: 'critic',
        name: 'Critic',
        role: 'critic',
        capabilities: ['code-quality', 'best-practices', 'refactoring'],
        canInitiate: false,
        canTerminate: false,
        maxConsecutiveTurns: 2,
      },
      {
        agentId: 'security',
        name: 'Security Reviewer',
        role: 'red-team',
        capabilities: ['security', 'vulnerabilities', 'compliance'],
        canInitiate: false,
        canTerminate: false,
        maxConsecutiveTurns: 1,
      },
      {
        agentId: 'finalizer',
        name: 'Finalizer',
        role: 'finalizer',
        capabilities: ['synthesis', 'decision-making'],
        canInitiate: false,
        canTerminate: true,
        maxConsecutiveTurns: 1,
      },
    ],
    selectionStrategy: 'capability-match' as SpeakerSelectionStrategy,
    terminationConditions: [
      { type: 'agent-decision' as const },
      { type: 'max-messages' as const, maxMessages: 20 },
    ],
  },

  /**
   * Research collaboration
   */
  RESEARCH_COLLAB: {
    name: 'Research Collaboration',
    description: 'Multiple researchers collaborate on a topic',
    participants: [
      {
        agentId: 'researcher-1',
        name: 'Primary Researcher',
        role: 'researcher',
        capabilities: ['research', 'analysis', 'synthesis'],
        canInitiate: true,
        canTerminate: false,
        maxConsecutiveTurns: 2,
      },
      {
        agentId: 'researcher-2',
        name: 'Secondary Researcher',
        role: 'researcher',
        capabilities: ['research', 'fact-checking', 'sources'],
        canInitiate: false,
        canTerminate: false,
        maxConsecutiveTurns: 2,
      },
      {
        agentId: 'critic',
        name: 'Research Critic',
        role: 'critic',
        capabilities: ['critical-thinking', 'gaps', 'bias'],
        canInitiate: false,
        canTerminate: false,
        maxConsecutiveTurns: 1,
      },
      {
        agentId: 'writer',
        name: 'Research Writer',
        role: 'writer',
        capabilities: ['writing', 'documentation', 'clarity'],
        canInitiate: false,
        canTerminate: true,
        maxConsecutiveTurns: 1,
      },
    ],
    selectionStrategy: 'round-robin' as SpeakerSelectionStrategy,
    terminationConditions: [
      { type: 'keyword' as const, keywords: ['research complete', 'analysis done'] },
      { type: 'max-messages' as const, maxMessages: 30 },
    ],
  },

  /**
   * Brainstorming session
   */
  BRAINSTORM: {
    name: 'Brainstorming Session',
    description: 'Creative ideation with diverse agents',
    participants: [
      {
        agentId: 'architect',
        name: 'Architect',
        role: 'architect',
        capabilities: ['design', 'systems-thinking'],
        canInitiate: true,
        canTerminate: false,
        maxConsecutiveTurns: 1,
      },
      {
        agentId: 'coder',
        name: 'Developer',
        role: 'coder',
        capabilities: ['implementation', 'feasibility'],
        canInitiate: false,
        canTerminate: false,
        maxConsecutiveTurns: 1,
      },
      {
        agentId: 'critic',
        name: 'Devil\'s Advocate',
        role: 'critic',
        capabilities: ['critique', 'challenges'],
        canInitiate: false,
        canTerminate: false,
        maxConsecutiveTurns: 1,
      },
      {
        agentId: 'finalizer',
        name: 'Synthesizer',
        role: 'finalizer',
        capabilities: ['synthesis', 'decision'],
        canInitiate: false,
        canTerminate: true,
        maxConsecutiveTurns: 2,
      },
    ],
    selectionStrategy: 'load-balanced' as SpeakerSelectionStrategy,
    terminationConditions: [
      { type: 'max-messages' as const, maxMessages: 15 },
      { type: 'agent-decision' as const },
    ],
  },
};
