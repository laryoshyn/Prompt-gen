import type { AgentTemplate, AgentRole } from '@/types/workflow';
import { AGENT_TEMPLATES, getAllAgentTemplates } from './agentTemplates';
import type { CustomAgent } from './customAgents';
import { promptFormDataToAgent } from './customAgents';
import { promptsDB } from '@/lib/storage/indexedDB';
import { openDB } from 'idb';

/**
 * Get shared IndexedDB instance
 * This ensures we use the same database connection as indexedDB.ts
 */
async function getDB() {
  return openDB('prompt-gen-db', 2, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Create prompts store
      if (!db.objectStoreNames.contains('prompts')) {
        const promptStore = db.createObjectStore('prompts', {
          keyPath: 'id',
        });
        promptStore.createIndex('name', 'name', { unique: false });
        promptStore.createIndex('model', 'model', { unique: false });
        promptStore.createIndex('createdAt', 'createdAt', { unique: false });
        promptStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Create workflows store
      if (!db.objectStoreNames.contains('workflows')) {
        const workflowStore = db.createObjectStore('workflows', {
          keyPath: 'id',
        });
        workflowStore.createIndex('name', 'name', { unique: false });
        workflowStore.createIndex('mode', 'mode', { unique: false });
        workflowStore.createIndex('createdAt', 'createdAt', { unique: false });
        workflowStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Create templates store
      if (!db.objectStoreNames.contains('templates')) {
        const templateStore = db.createObjectStore('templates', {
          keyPath: 'id',
        });
        templateStore.createIndex('category', 'category', { unique: false });
        templateStore.createIndex('source', 'source', { unique: false });
        templateStore.createIndex('name', 'name', { unique: false });
      }

      // Create versions store
      if (!db.objectStoreNames.contains('versions')) {
        const versionStore = db.createObjectStore('versions', {
          keyPath: 'id',
        });
        versionStore.createIndex('promptId', 'promptId', { unique: false });
        versionStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Create custom-agents store (added in v2)
      if (!db.objectStoreNames.contains('custom-agents')) {
        const customAgentStore = db.createObjectStore('custom-agents', {
          keyPath: 'id',
        });
        customAgentStore.createIndex('name', 'name', { unique: false });
        customAgentStore.createIndex('source', 'source', { unique: false });
        customAgentStore.createIndex('role', 'role', { unique: false });
        customAgentStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    },
  });
}

/**
 * Dynamic Agent Registry
 * Manages both built-in and custom agents
 */
class AgentRegistry {
  private customAgents: Map<string, CustomAgent> = new Map();
  private listeners: Set<() => void> = new Set();

  /**
   * Initialize registry and load custom agents from IndexedDB
   */
  async initialize(): Promise<void> {
    // Load custom agents from IndexedDB custom-agents store
    const db = await getDB();
    const customAgents = await db.getAll('custom-agents');
    customAgents.forEach(agent => {
      this.customAgents.set(agent.id, agent);
    });
  }

  /**
   * Get all agents (built-in + custom)
   */
  getAllAgents(): AgentTemplate[] {
    const builtIn = getAllAgentTemplates();
    const custom = Array.from(this.customAgents.values());
    return [...builtIn, ...custom];
  }

  /**
   * Get agent by ID (checks both built-in and custom)
   */
  getAgent(id: string): AgentTemplate | undefined {
    // Check custom agents first
    const custom = this.customAgents.get(id);
    if (custom) return custom;

    // Check built-in templates
    return getAllAgentTemplates().find(t => t.id === id);
  }

  /**
   * Get agent by role (prioritizes built-in)
   */
  getAgentByRole(role: AgentRole): AgentTemplate | undefined {
    // Prioritize built-in templates
    const builtIn = AGENT_TEMPLATES[role];
    if (builtIn) return builtIn;

    // Fall back to custom agents with matching role
    return Array.from(this.customAgents.values()).find(a => a.role === role);
  }

  /**
   * Get all custom agents
   */
  getCustomAgents(): CustomAgent[] {
    return Array.from(this.customAgents.values());
  }

  /**
   * Get custom agents by source
   */
  getCustomAgentsBySource(source: 'file' | 'prompt-library' | 'user'): CustomAgent[] {
    return Array.from(this.customAgents.values()).filter(a => a.source === source);
  }

  /**
   * Add custom agent
   */
  async addCustomAgent(agent: CustomAgent): Promise<void> {
    // Check for duplicate names
    const existing = Array.from(this.customAgents.values()).find(
      a => a.name.toLowerCase() === agent.name.toLowerCase()
    );
    if (existing) {
      throw new Error(`Agent with name "${agent.name}" already exists`);
    }

    // Save to map
    this.customAgents.set(agent.id, agent);

    // Persist to IndexedDB
    const db = await getDB();
    await db.put('custom-agents', agent);

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Update custom agent
   */
  async updateCustomAgent(id: string, updates: Partial<CustomAgent>): Promise<void> {
    const agent = this.customAgents.get(id);
    if (!agent) {
      throw new Error(`Custom agent with id "${id}" not found`);
    }

    const updated = {
      ...agent,
      ...updates,
      updatedAt: Date.now(),
    };

    this.customAgents.set(id, updated);

    // Persist to IndexedDB
    const db = await getDB();
    await db.put('custom-agents', updated);

    this.notifyListeners();
  }

  /**
   * Delete custom agent
   */
  async deleteCustomAgent(id: string): Promise<void> {
    if (!this.customAgents.has(id)) {
      throw new Error(`Custom agent with id "${id}" not found`);
    }

    this.customAgents.delete(id);

    // Delete from IndexedDB
    const db = await getDB();
    await db.delete('custom-agents', id);

    this.notifyListeners();
  }

  /**
   * Import agents from Prompt Library
   */
  async importFromPromptLibrary(promptIds?: string[]): Promise<number> {
    const prompts = promptIds
      ? await Promise.all(promptIds.map(id => promptsDB.get(id))).then(p => p.filter(Boolean))
      : await promptsDB.getAll();

    let imported = 0;
    for (const prompt of prompts) {
      if (!prompt) continue;

      try {
        const agent = promptFormDataToAgent(prompt);
        await this.addCustomAgent(agent);
        imported++;
      } catch (error) {
        console.error(`Failed to import prompt ${prompt.name}:`, error);
      }
    }

    return imported;
  }

  /**
   * Check if agent exists
   */
  hasAgent(id: string): boolean {
    return this.customAgents.has(id) || getAllAgentTemplates().some(t => t.id === id);
  }

  /**
   * Subscribe to agent registry changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Clear all custom agents
   */
  async clearCustomAgents(): Promise<void> {
    this.customAgents.clear();

    const db = await getDB();
    await db.clear('custom-agents');

    this.notifyListeners();
  }

  /**
   * Get agent count
   */
  getAgentCount(): { total: number; builtIn: number; custom: number } {
    const builtIn = getAllAgentTemplates().length;
    const custom = this.customAgents.size;
    return {
      total: builtIn + custom,
      builtIn,
      custom,
    };
  }
}

// Singleton instance
export const agentRegistry = new AgentRegistry();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  agentRegistry.initialize().catch(console.error);
}
