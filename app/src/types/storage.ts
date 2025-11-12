import type { PromptFormData } from './prompt';
import type { WorkflowGraph } from './workflow';

export interface StorageSchema {
  prompts: PromptFormData;
  workflows: WorkflowGraph;
  templates: {
    id: string;
    name: string;
    content: string;
  };
}

export type StorageKey = keyof StorageSchema;

export interface StorageManager {
  init(): Promise<void>;
  save<K extends StorageKey>(
    store: K,
    data: StorageSchema[K]
  ): Promise<void>;
  get<K extends StorageKey>(store: K, id: string): Promise<StorageSchema[K] | undefined>;
  getAll<K extends StorageKey>(store: K): Promise<StorageSchema[K][]>;
  delete<K extends StorageKey>(store: K, id: string): Promise<void>;
}
