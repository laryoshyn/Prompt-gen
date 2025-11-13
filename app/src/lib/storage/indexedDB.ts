import { openDB, type IDBPDatabase } from 'idb';
import type { PromptFormData } from '@/types/prompt';
import type { WorkflowGraph } from '@/types/workflow';
import type { UniversalPrompt, StoredPrompt } from '@/types/prompt-unified';

/**
 * IndexedDB storage manager for prompts, workflows, and templates
 *
 * Version History:
 * - v1: Initial schema (prompts, workflows, templates, versions)
 * - v2: Added custom-agents store
 * - v3: Unified prompts (replaced prompts + custom-agents with unified-prompts)
 *
 * Uses idb wrapper for better API
 */

const DB_NAME = 'prompt-gen-db';
const DB_VERSION = 3;

// Store names
const STORES = {
  UNIFIED_PROMPTS: 'unified-prompts',  // NEW in v3: replaces prompts + custom-agents
  WORKFLOWS: 'workflows',
  TEMPLATES: 'templates',
  VERSIONS: 'versions',
  // Legacy stores (kept for migration, deprecated)
  PROMPTS: 'prompts',  // DEPRECATED in v3
  CUSTOM_AGENTS: 'custom-agents',  // DEPRECATED in v3
} as const;

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  content: Partial<PromptFormData>;
  source: 'guide' | 'user';
  createdAt: number;
}

interface PromptVersion {
  id: string;
  promptId: string;
  version: number;
  data: PromptFormData;
  timestamp: number;
  changesSummary?: string;
}

/**
 * Initialize IndexedDB database
 */
async function initDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Create prompts store
      if (!db.objectStoreNames.contains(STORES.PROMPTS)) {
        const promptStore = db.createObjectStore(STORES.PROMPTS, {
          keyPath: 'id',
        });
        promptStore.createIndex('name', 'name', { unique: false });
        promptStore.createIndex('model', 'model', { unique: false });
        promptStore.createIndex('createdAt', 'createdAt', { unique: false });
        promptStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Create workflows store
      if (!db.objectStoreNames.contains(STORES.WORKFLOWS)) {
        const workflowStore = db.createObjectStore(STORES.WORKFLOWS, {
          keyPath: 'id',
        });
        workflowStore.createIndex('name', 'name', { unique: false });
        workflowStore.createIndex('mode', 'mode', { unique: false });
        workflowStore.createIndex('createdAt', 'createdAt', { unique: false });
        workflowStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Create templates store
      if (!db.objectStoreNames.contains(STORES.TEMPLATES)) {
        const templateStore = db.createObjectStore(STORES.TEMPLATES, {
          keyPath: 'id',
        });
        templateStore.createIndex('category', 'category', { unique: false });
        templateStore.createIndex('source', 'source', { unique: false });
        templateStore.createIndex('name', 'name', { unique: false });
      }

      // Create versions store
      if (!db.objectStoreNames.contains(STORES.VERSIONS)) {
        const versionStore = db.createObjectStore(STORES.VERSIONS, {
          keyPath: 'id',
        });
        versionStore.createIndex('promptId', 'promptId', { unique: false });
        versionStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Create custom-agents store (added in v2)
      if (!db.objectStoreNames.contains(STORES.CUSTOM_AGENTS)) {
        const customAgentStore = db.createObjectStore(STORES.CUSTOM_AGENTS, {
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
 * Prompts operations
 */
export const promptsDB = {
  async save(prompt: PromptFormData): Promise<void> {
    const db = await initDB();
    await db.put(STORES.PROMPTS, prompt);
  },

  async get(id: string): Promise<PromptFormData | undefined> {
    const db = await initDB();
    return db.get(STORES.PROMPTS, id);
  },

  async getAll(): Promise<PromptFormData[]> {
    const db = await initDB();
    return db.getAll(STORES.PROMPTS);
  },

  async getAllSorted(
    sortBy: 'name' | 'createdAt' | 'updatedAt' = 'updatedAt',
    order: 'asc' | 'desc' = 'desc'
  ): Promise<PromptFormData[]> {
    const db = await initDB();
    const prompts = await db.getAllFromIndex(STORES.PROMPTS, sortBy);
    return order === 'desc' ? prompts.reverse() : prompts;
  },

  async delete(id: string): Promise<void> {
    const db = await initDB();
    await db.delete(STORES.PROMPTS, id);
    // Also delete associated versions
    await versionsDB.deleteByPromptId(id);
  },

  async search(query: string): Promise<PromptFormData[]> {
    const db = await initDB();
    const allPrompts = await db.getAll(STORES.PROMPTS);

    const lowerQuery = query.toLowerCase();

    return allPrompts.filter((prompt) => {
      return (
        prompt.name.toLowerCase().includes(lowerQuery) ||
        prompt.objective.toLowerCase().includes(lowerQuery) ||
        prompt.domain.toLowerCase().includes(lowerQuery) ||
        prompt.audience.toLowerCase().includes(lowerQuery)
      );
    });
  },

  async filterByModel(model: string): Promise<PromptFormData[]> {
    const db = await initDB();
    return db.getAllFromIndex(STORES.PROMPTS, 'model', model);
  },

  async count(): Promise<number> {
    const db = await initDB();
    return db.count(STORES.PROMPTS);
  },
};

/**
 * Workflows operations
 */
export const workflowsDB = {
  async save(workflow: WorkflowGraph): Promise<void> {
    const db = await initDB();
    await db.put(STORES.WORKFLOWS, workflow);
  },

  async get(id: string): Promise<WorkflowGraph | undefined> {
    const db = await initDB();
    return db.get(STORES.WORKFLOWS, id);
  },

  async getAll(): Promise<WorkflowGraph[]> {
    const db = await initDB();
    return db.getAll(STORES.WORKFLOWS);
  },

  async getAllSorted(
    sortBy: 'name' | 'createdAt' | 'updatedAt' = 'updatedAt',
    order: 'asc' | 'desc' = 'desc'
  ): Promise<WorkflowGraph[]> {
    const db = await initDB();
    const workflows = await db.getAllFromIndex(STORES.WORKFLOWS, sortBy);
    return order === 'desc' ? workflows.reverse() : workflows;
  },

  async delete(id: string): Promise<void> {
    const db = await initDB();
    await db.delete(STORES.WORKFLOWS, id);
  },

  async search(query: string): Promise<WorkflowGraph[]> {
    const db = await initDB();
    const allWorkflows = await db.getAll(STORES.WORKFLOWS);

    const lowerQuery = query.toLowerCase();

    return allWorkflows.filter((workflow) => {
      return (
        workflow.name.toLowerCase().includes(lowerQuery) ||
        (workflow.description && workflow.description.toLowerCase().includes(lowerQuery))
      );
    });
  },

  async count(): Promise<number> {
    const db = await initDB();
    return db.count(STORES.WORKFLOWS);
  },
};

/**
 * Templates operations
 */
export const templatesDB = {
  async save(template: Template): Promise<void> {
    const db = await initDB();
    await db.put(STORES.TEMPLATES, template);
  },

  async get(id: string): Promise<Template | undefined> {
    const db = await initDB();
    return db.get(STORES.TEMPLATES, id);
  },

  async getAll(): Promise<Template[]> {
    const db = await initDB();
    return db.getAll(STORES.TEMPLATES);
  },

  async getByCategory(category: string): Promise<Template[]> {
    const db = await initDB();
    return db.getAllFromIndex(STORES.TEMPLATES, 'category', category);
  },

  async getBySource(source: 'guide' | 'user'): Promise<Template[]> {
    const db = await initDB();
    return db.getAllFromIndex(STORES.TEMPLATES, 'source', source);
  },

  async delete(id: string): Promise<void> {
    const db = await initDB();
    await db.delete(STORES.TEMPLATES, id);
  },

  async count(): Promise<number> {
    const db = await initDB();
    return db.count(STORES.TEMPLATES);
  },
};

/**
 * Versions operations
 */
export const versionsDB = {
  async save(version: PromptVersion): Promise<void> {
    const db = await initDB();
    await db.put(STORES.VERSIONS, version);
  },

  async getByPromptId(promptId: string): Promise<PromptVersion[]> {
    const db = await initDB();
    const versions = await db.getAllFromIndex(STORES.VERSIONS, 'promptId', promptId);
    // Sort by version number descending
    return versions.sort((a, b) => b.version - a.version);
  },

  async getLatest(promptId: string): Promise<PromptVersion | undefined> {
    const versions = await this.getByPromptId(promptId);
    return versions[0];
  },

  async deleteByPromptId(promptId: string): Promise<void> {
    const db = await initDB();
    const versions = await db.getAllFromIndex(STORES.VERSIONS, 'promptId', promptId);
    const tx = db.transaction(STORES.VERSIONS, 'readwrite');
    await Promise.all([
      ...versions.map((v) => tx.store.delete(v.id)),
      tx.done,
    ]);
  },

  async count(promptId?: string): Promise<number> {
    const db = await initDB();
    if (promptId) {
      return db.countFromIndex(STORES.VERSIONS, 'promptId', promptId);
    }
    return db.count(STORES.VERSIONS);
  },
};

/**
 * Create version snapshot of prompt
 */
export async function createVersionSnapshot(
  prompt: PromptFormData,
  changesSummary?: string
): Promise<void> {
  const existingVersions = await versionsDB.getByPromptId(prompt.id);
  const newVersion = existingVersions.length + 1;

  const version: PromptVersion = {
    id: `${prompt.id}-v${newVersion}`,
    promptId: prompt.id,
    version: newVersion,
    data: { ...prompt },
    timestamp: Date.now(),
    changesSummary,
  };

  await versionsDB.save(version);
}

/**
 * Export database for backup
 */
export async function exportDatabase(): Promise<{
  prompts: PromptFormData[];
  workflows: WorkflowGraph[];
  templates: Template[];
  versions: PromptVersion[];
}> {
  return {
    prompts: await promptsDB.getAll(),
    workflows: await workflowsDB.getAll(),
    templates: await templatesDB.getAll(),
    versions: await versionsDB.getByPromptId(''), // Get all versions
  };
}

/**
 * Import database from backup
 */
export async function importDatabase(data: {
  prompts?: PromptFormData[];
  workflows?: WorkflowGraph[];
  templates?: Template[];
  versions?: PromptVersion[];
}): Promise<void> {
  if (data.prompts) {
    await Promise.all(data.prompts.map((p) => promptsDB.save(p)));
  }
  if (data.workflows) {
    await Promise.all(data.workflows.map((w) => workflowsDB.save(w)));
  }
  if (data.templates) {
    await Promise.all(data.templates.map((t) => templatesDB.save(t)));
  }
  if (data.versions) {
    await Promise.all(data.versions.map((v) => versionsDB.save(v)));
  }
}

/**
 * Clear all data (use with caution!)
 */
export async function clearAllData(): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(Object.values(STORES), 'readwrite');

  await Promise.all([
    ...Object.values(STORES).map((storeName) => tx.objectStore(storeName).clear()),
    tx.done,
  ]);
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  prompts: number;
  workflows: number;
  templates: number;
  versions: number;
}> {
  return {
    prompts: await promptsDB.count(),
    workflows: await workflowsDB.count(),
    templates: await templatesDB.count(),
    versions: await versionsDB.count(),
  };
}
