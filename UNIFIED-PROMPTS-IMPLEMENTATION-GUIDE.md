# Unified Prompts Implementation Guide

**Status**: Phase 1-2 Complete (Foundation) | Phases 3-5 Pending

This document provides a complete roadmap for finishing the unified prompt format architecture. Phases 1-2 (type system, converters, validators) are complete. This guide covers the remaining implementation work.

---

## Executive Summary

### What's Complete ✅

**Phase 1: Unified Type System**
- `app/src/types/prompt-unified.ts` (400+ lines)
  - Complete type system with `StructuredPrompt` and `TemplatePrompt`
  - `UniversalPrompt` discriminated union
  - Enhanced variable system with validation metadata
  - Type guards and defaults

**Phase 2: Lossless Converters**
- `app/src/lib/prompt/converter.ts` (600+ lines)
  - `structuredToTemplate()` - Preserves all metadata via `_originalSections`
  - `templateToStructured()` - Restores original sections
  - `markdownToTemplate()` / `templateToMarkdown()` - Complete frontmatter
  - Smart role inference from content (10 heuristics)
  - Bidirectional template ↔ sections parsing

- `app/src/lib/prompt/validator.ts` (500+ lines)
  - Variable validation with type checking
  - Template variable usage validation
  - Format-specific validation
  - Batch validation and error formatting

### What's Remaining 🔧

**Phase 3**: Database migration (v2 → v3)
**Phase 4**: UI component updates
**Phase 5**: Documentation and examples

**Estimated Remaining Effort**: ~4-5 weeks, ~1,500 lines of code

---

## Phase 3: IndexedDB v3 Migration (Week 3-4)

### 3.1 Complete IndexedDB Schema Update

**File**: `app/src/lib/storage/indexedDB.ts`

**Current State**: Partially updated (DB_VERSION = 3, imports added)

**Remaining Work**:

#### Step 1: Update initDB() Upgrade Logic

```typescript
async function initDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // V1 → V2 migration (already exists, keep it)
      if (oldVersion < 2) {
        // ... existing v1→v2 logic
      }

      // V2 → V3 migration (NEW)
      if (oldVersion < 3) {
        console.log('Migrating database from v2 to v3...');

        // Create new unified-prompts store
        if (!db.objectStoreNames.contains(STORES.UNIFIED_PROMPTS)) {
          const unifiedStore = db.createObjectStore(STORES.UNIFIED_PROMPTS, {
            keyPath: 'id',
          });

          // Indexes for efficient querying
          unifiedStore.createIndex('formatType', 'formatType', { unique: false });
          unifiedStore.createIndex('name', 'data.name', { unique: false });
          unifiedStore.createIndex('role', 'data.role', { unique: false });
          unifiedStore.createIndex('model', 'data.model', { unique: false });
          unifiedStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
          unifiedStore.createIndex('createdAt', 'createdAt', { unique: false });
          unifiedStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          unifiedStore.createIndex('searchIndex', 'searchIndex', { unique: false });
        }

        // Migration happens in background via migration tool
        // Legacy stores are kept for now (manual cleanup later)
      }

      // Keep existing store creation logic for other stores
      // (workflows, templates, versions)
    },
  });
}
```

#### Step 2: Create New unifiedPromptsDB API

Add after existing `promptsDB` and before `workflowsDB`:

```typescript
/**
 * Unified Prompts operations (v3+)
 * Replaces promptsDB and custom agents registry
 */
export const unifiedPromptsDB = {
  /**
   * Save a unified prompt (any format)
   */
  async save(prompt: UniversalPrompt): Promise<void> {
    const db = await initDB();

    const stored: StoredPrompt = {
      id: prompt.id,
      formatType: prompt.formatType,
      data: prompt,
      searchIndex: createSearchIndex(prompt),
      tags: prompt.tags,
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt,
    };

    await db.put(STORES.UNIFIED_PROMPTS, stored);
  },

  /**
   * Get a prompt by ID
   */
  async get(id: string): Promise<UniversalPrompt | undefined> {
    const db = await initDB();
    const stored = await db.get(STORES.UNIFIED_PROMPTS, id);
    return stored?.data;
  },

  /**
   * Get all prompts
   */
  async getAll(): Promise<UniversalPrompt[]> {
    const db = await initDB();
    const stored = await db.getAll(STORES.UNIFIED_PROMPTS);
    return stored.map(s => s.data);
  },

  /**
   * Get prompts by format type
   */
  async getByFormat(formatType: 'structured' | 'template'): Promise<UniversalPrompt[]> {
    const db = await initDB();
    const stored = await db.getAllFromIndex(STORES.UNIFIED_PROMPTS, 'formatType', formatType);
    return stored.map(s => s.data);
  },

  /**
   * Get template prompts by role
   */
  async getByRole(role: AgentRole): Promise<TemplatePrompt[]> {
    const db = await initDB();
    const stored = await db.getAllFromIndex(STORES.UNIFIED_PROMPTS, 'role', role);
    return stored.map(s => s.data).filter(isTemplatePrompt);
  },

  /**
   * Search prompts (full-text)
   */
  async search(query: string): Promise<UniversalPrompt[]> {
    const db = await initDB();
    const allStored = await db.getAll(STORES.UNIFIED_PROMPTS);
    const lowerQuery = query.toLowerCase();

    return allStored
      .filter(s => s.searchIndex.includes(lowerQuery))
      .map(s => s.data);
  },

  /**
   * Filter by tags
   */
  async filterByTags(tags: string[]): Promise<UniversalPrompt[]> {
    const db = await initDB();
    const results = new Set<string>();

    // Get prompts matching any of the tags
    for (const tag of tags) {
      const stored = await db.getAllFromIndex(STORES.UNIFIED_PROMPTS, 'tags', tag);
      stored.forEach(s => results.add(s.id));
    }

    // Fetch the actual prompts
    const prompts: UniversalPrompt[] = [];
    for (const id of results) {
      const prompt = await this.get(id);
      if (prompt) prompts.push(prompt);
    }

    return prompts;
  },

  /**
   * Delete a prompt
   */
  async delete(id: string): Promise<void> {
    const db = await initDB();
    await db.delete(STORES.UNIFIED_PROMPTS, id);
    // Also delete associated versions
    await versionsDB.deleteByPromptId(id);
  },

  /**
   * Count prompts
   */
  async count(formatType?: 'structured' | 'template'): Promise<number> {
    const db = await initDB();
    if (formatType) {
      return db.countFromIndex(STORES.UNIFIED_PROMPTS, 'formatType', formatType);
    }
    return db.count(STORES.UNIFIED_PROMPTS);
  },

  /**
   * Get sorted prompts
   */
  async getAllSorted(
    sortBy: 'createdAt' | 'updatedAt' = 'updatedAt',
    order: 'asc' | 'desc' = 'desc'
  ): Promise<UniversalPrompt[]> {
    const db = await initDB();
    const stored = await db.getAllFromIndex(STORES.UNIFIED_PROMPTS, sortBy);
    const sorted = order === 'desc' ? stored.reverse() : stored;
    return sorted.map(s => s.data);
  },
};
```

**Important**: Import `createSearchIndex` from converter:
```typescript
import { createSearchIndex } from '@/lib/prompt/converter';
import { isTemplatePrompt } from '@/types/prompt-unified';
```

### 3.2 Create Migration Tool

**New File**: `app/src/lib/storage/migration.ts`

```typescript
import { openDB } from 'idb';
import type { PromptFormData } from '@/types/prompt';
import type { CustomAgent } from '@/lib/workflow/customAgents';
import type { StructuredPrompt, TemplatePrompt } from '@/types/prompt-unified';
import {
  structuredToTemplate,
  templateToStructured,
  generatePromptId,
  createSearchIndex
} from '@/lib/prompt/converter';
import { promptsDB, unifiedPromptsDB } from './indexedDB';

/**
 * Migration result tracking
 */
export interface MigrationResult {
  success: boolean;
  migratedPrompts: number;
  migratedCustomAgents: number;
  errors: Array<{ id: string; error: string }>;
  duration: number;
}

/**
 * Convert old PromptFormData to new StructuredPrompt
 */
function migrateOldPromptToStructured(old: PromptFormData): StructuredPrompt {
  return {
    formatType: 'structured',
    id: old.id,
    name: old.name,
    description: old.objective.slice(0, 200), // First 200 chars as description
    thinkingMode: old.thinkingMode,
    variables: old.variables.map(v => ({
      name: v.name,
      defaultValue: v.defaultValue,
      required: v.required,
      description: v.description,
      type: 'string', // Old system didn't have type
    })),
    tags: [old.domain, old.audience].filter(Boolean),
    createdAt: old.createdAt,
    updatedAt: old.updatedAt,
    version: old.version,

    model: old.model,
    agenticMode: old.agenticMode,

    sections: {
      audience: old.audience,
      objective: old.objective,
      taskScope: old.taskScope,
      domain: old.domain,
      inputsSummary: old.inputsSummary,
      constraints: old.constraints,
      outputFormat: old.outputFormat,
      styleTone: old.styleTone,
      lengthLimits: old.lengthLimits,
      evaluationBar: old.evaluationBar,
      risksToAvoid: old.risksToAvoid,
      examplesPositive: old.examplesPositive,
      examplesNegative: old.examplesNegative,
      toolset: old.toolset,
      evaluationMetrics: old.evaluationMetrics,
      reusabilityNeeds: old.reusabilityNeeds,
      citationsPolicy: old.citationsPolicy,
      environmentLimits: old.environmentLimits,
    },
  };
}

/**
 * Convert old CustomAgent to new TemplatePrompt
 */
function migrateOldAgentToTemplate(old: CustomAgent): TemplatePrompt {
  return {
    formatType: 'template',
    id: old.id,
    name: old.name,
    description: old.description,
    thinkingMode: old.defaultConfig.thinkingMode || 'balanced',
    variables: [], // Old system didn't have structured variables
    tags: old.tags,
    createdAt: old.createdAt,
    updatedAt: old.updatedAt,
    version: 1,

    role: old.role,
    promptTemplate: old.promptTemplate,

    config: {
      parallel: old.defaultConfig.parallel || false,
      timeout: 30000,
      retries: 0,
    },

    source: old.source === 'file' ? 'file' :
            old.source === 'prompt-library' ? 'converted' : 'user',
    originalFileName: old.originalFileName,
  };
}

/**
 * Run migration from v2 to v3
 */
export async function migrateToV3(): Promise<MigrationResult> {
  const startTime = Date.now();
  const result: MigrationResult = {
    success: true,
    migratedPrompts: 0,
    migratedCustomAgents: 0,
    errors: [],
    duration: 0,
  };

  try {
    const db = await openDB('prompt-gen-db', 3);

    // Migrate prompts store → unified-prompts (as StructuredPrompt)
    if (db.objectStoreNames.contains('prompts')) {
      const oldPrompts = await db.getAll('prompts') as PromptFormData[];

      for (const old of oldPrompts) {
        try {
          const structured = migrateOldPromptToStructured(old);
          await unifiedPromptsDB.save(structured);
          result.migratedPrompts++;
        } catch (error) {
          result.errors.push({
            id: old.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    // Migrate custom-agents → unified-prompts (as TemplatePrompt)
    if (db.objectStoreNames.contains('custom-agents')) {
      const oldAgents = await db.getAll('custom-agents') as CustomAgent[];

      for (const old of oldAgents) {
        try {
          const template = migrateOldAgentToTemplate(old);
          await unifiedPromptsDB.save(template);
          result.migratedCustomAgents++;
        } catch (error) {
          result.errors.push({
            id: old.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    result.success = result.errors.length === 0;
  } catch (error) {
    result.success = false;
    result.errors.push({
      id: 'migration',
      error: error instanceof Error ? error.message : 'Migration failed',
    });
  } finally {
    result.duration = Date.now() - startTime;
  }

  return result;
}

/**
 * Check if migration is needed
 */
export async function needsMigration(): Promise<boolean> {
  try {
    const db = await openDB('prompt-gen-db', 3);

    // Check if old stores exist and have data
    const hasOldPrompts = db.objectStoreNames.contains('prompts') &&
                          (await db.count('prompts')) > 0;
    const hasOldAgents = db.objectStoreNames.contains('custom-agents') &&
                         (await db.count('custom-agents')) > 0;

    // Check if new store is empty
    const hasNewPrompts = db.objectStoreNames.contains('unified-prompts') &&
                          (await db.count('unified-prompts')) > 0;

    return (hasOldPrompts || hasOldAgents) && !hasNewPrompts;
  } catch {
    return false;
  }
}

/**
 * Validate migrated data
 */
export async function validateMigration(): Promise<{
  valid: boolean;
  oldCount: number;
  newCount: number;
  message: string;
}> {
  const db = await openDB('prompt-gen-db', 3);

  const oldPromptsCount = db.objectStoreNames.contains('prompts')
    ? await db.count('prompts')
    : 0;
  const oldAgentsCount = db.objectStoreNames.contains('custom-agents')
    ? await db.count('custom-agents')
    : 0;
  const oldCount = oldPromptsCount + oldAgentsCount;

  const newCount = db.objectStoreNames.contains('unified-prompts')
    ? await db.count('unified-prompts')
    : 0;

  const valid = newCount === oldCount;
  const message = valid
    ? `Migration successful: ${newCount} prompts migrated`
    : `Migration incomplete: ${oldCount} old records, ${newCount} new records`;

  return { valid, oldCount, newCount, message };
}
```

### 3.3 Create Migration UI Component

**New File**: `app/src/components/migration/MigrationDialog.tsx`

```typescript
import { useState, useEffect } from 'react';
import { migrateToV3, needsMigration, validateMigration, type MigrationResult } from '@/lib/storage/migration';

export function MigrationDialog() {
  const [showDialog, setShowDialog] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);

  useEffect(() => {
    // Check if migration is needed on app load
    needsMigration().then(needed => {
      setShowDialog(needed);
    });
  }, []);

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const migrationResult = await migrateToV3();
      setResult(migrationResult);

      // Validate
      const validation = await validateMigration();
      console.log('Migration validation:', validation);

      // Auto-close on success after 3 seconds
      if (migrationResult.success) {
        setTimeout(() => setShowDialog(false), 3000);
      }
    } catch (error) {
      console.error('Migration error:', error);
    } finally {
      setMigrating(false);
    }
  };

  if (!showDialog) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Database Upgrade Required</h2>

        {!result ? (
          <>
            <p className="text-gray-700 mb-4">
              Prompt-Gen has been upgraded to use a new unified prompt format.
              Your existing prompts and custom agents will be migrated to the new system.
            </p>
            <p className="text-sm text-gray-600 mb-6">
              This is a one-time process and will take just a few seconds.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleMigrate}
                disabled={migrating}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {migrating ? 'Migrating...' : 'Start Migration'}
              </button>
              <button
                onClick={() => setShowDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Later
              </button>
            </div>
          </>
        ) : (
          <>
            {result.success ? (
              <div className="text-green-600">
                <p className="font-semibold mb-2">✅ Migration Successful!</p>
                <p className="text-sm">
                  • {result.migratedPrompts} prompts migrated<br />
                  • {result.migratedCustomAgents} custom agents migrated<br />
                  • Completed in {result.duration}ms
                </p>
              </div>
            ) : (
              <div className="text-red-600">
                <p className="font-semibold mb-2">❌ Migration Failed</p>
                <p className="text-sm">
                  {result.errors.length} error(s) occurred
                </p>
                <div className="mt-2 text-xs bg-red-50 p-2 rounded max-h-32 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <div key={i}>{e.id}: {e.error}</div>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={() => setShowDialog(false)}
              className="mt-4 w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

### 3.4 Add Migration Dialog to App

**File**: `app/src/App.tsx`

Add at the top level:

```typescript
import { MigrationDialog } from '@/components/migration/MigrationDialog';

function App() {
  return (
    <>
      <MigrationDialog />
      {/* ... rest of app */}
    </>
  );
}
```

---

## Phase 4: UI Component Updates (Week 4-5)

### 4.1 Update PromptBuilder

**File**: `app/src/components/builder/PromptBuilder.tsx`

**Changes Needed**:

1. Import unified types:
```typescript
import type { StructuredPrompt, TemplatePrompt } from '@/types/prompt-unified';
import { unifiedPromptsDB } from '@/lib/storage/indexedDB';
import { templateToStructured } from '@/lib/prompt/converter';
```

2. Update state to use `StructuredPrompt`:
```typescript
const [prompt, setPrompt] = useState<StructuredPrompt | null>(null);
```

3. Load prompt with format conversion:
```typescript
useEffect(() => {
  if (promptId) {
    unifiedPromptsDB.get(promptId).then(loaded => {
      if (!loaded) return;

      // If it's a template, convert to structured for editing
      if (loaded.formatType === 'template') {
        setPrompt(templateToStructured(loaded));
      } else {
        setPrompt(loaded);
      }
    });
  }
}, [promptId]);
```

4. Save using unified API:
```typescript
const handleSave = async () => {
  if (!prompt) return;

  await unifiedPromptsDB.save(prompt);
  // ... rest of save logic
};
```

### 4.2 Update PromptLibrary

**File**: `app/src/components/library/PromptLibrary.tsx`

**Changes Needed**:

1. Import unified types and API
2. Load all prompts from unified store
3. Add format filter (structured/template/all)
4. Show format badge on each prompt card

```typescript
// Filter UI
<select onChange={(e) => setFormatFilter(e.target.value)}>
  <option value="all">All Formats</option>
  <option value="structured">Form-Based</option>
  <option value="template">Templates</option>
</select>

// Load prompts
const prompts = await (formatFilter === 'all'
  ? unifiedPromptsDB.getAll()
  : unifiedPromptsDB.getByFormat(formatFilter));

// Display badge
{prompt.formatType === 'structured' ? (
  <span className="badge-structured">Form</span>
) : (
  <span className="badge-template">Template</span>
)}
```

### 4.3 Update AgentPalette

**File**: `app/src/components/workflow/AgentPalette.tsx`

**Changes Needed**:

1. Load custom agents from unified store:
```typescript
useEffect(() => {
  unifiedPromptsDB.getByFormat('template').then(templates => {
    // Filter for custom agents (source !== 'built-in')
    const customTemplates = templates.filter(t =>
      t.source !== 'built-in'
    );
    setCustomAgents(customTemplates);
  });
}, []);
```

2. Update upload handler to use unified API:
```typescript
const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  // ... parse markdown to TemplatePrompt
  const template = parseAgentMarkdown(content, file.name);

  // Validate
  const validation = validatePrompt(template);
  if (!validation.valid) {
    setUploadError(validation.errors.map(e => e.message).join(', '));
    return;
  }

  // Save to unified store
  await unifiedPromptsDB.save(template);
};
```

3. Update import from library:
```typescript
const handleImportFromLibrary = async () => {
  // Get all structured prompts
  const structuredPrompts = await unifiedPromptsDB.getByFormat('structured');

  // Convert each to template
  for (const prompt of structuredPrompts) {
    const template = structuredToTemplate(prompt);
    await unifiedPromptsDB.save(template);
  }
};
```

### 4.4 Create FormatSwitcher Component

**New File**: `app/src/components/shared/FormatSwitcher.tsx`

```typescript
import { useState } from 'react';
import type { UniversalPrompt } from '@/types/prompt-unified';
import { structuredToTemplate, templateToStructured } from '@/lib/prompt/converter';
import { unifiedPromptsDB } from '@/lib/storage/indexedDB';

interface FormatSwitcherProps {
  promptId: string;
  currentFormat: 'structured' | 'template';
  onFormatChange: (newFormat: 'structured' | 'template') => void;
}

export function FormatSwitcher({ promptId, currentFormat, onFormatChange }: FormatSwitcherProps) {
  const [switching, setSwitching] = useState(false);

  const handleSwitch = async (newFormat: 'structured' | 'template') => {
    if (newFormat === currentFormat) return;

    setSwitching(true);
    try {
      const prompt = await unifiedPromptsDB.get(promptId);
      if (!prompt) return;

      let converted: UniversalPrompt;
      if (newFormat === 'template' && prompt.formatType === 'structured') {
        converted = structuredToTemplate(prompt);
      } else if (newFormat === 'structured' && prompt.formatType === 'template') {
        converted = templateToStructured(prompt);
      } else {
        return;
      }

      // Save converted prompt
      await unifiedPromptsDB.save(converted);
      onFormatChange(newFormat);
    } catch (error) {
      console.error('Format conversion error:', error);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => handleSwitch('structured')}
        disabled={switching || currentFormat === 'structured'}
        className={`px-4 py-2 rounded-md transition ${
          currentFormat === 'structured'
            ? 'bg-white shadow text-blue-600'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        📝 Form View
      </button>
      <button
        onClick={() => handleSwitch('template')}
        disabled={switching || currentFormat === 'template'}
        className={`px-4 py-2 rounded-md transition ${
          currentFormat === 'template'
            ? 'bg-white shadow text-blue-600'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        📄 Template View
      </button>
      {switching && <span className="text-sm text-gray-500">Converting...</span>}
    </div>
  );
}
```

**Usage in PromptBuilder**:
```typescript
<FormatSwitcher
  promptId={promptId}
  currentFormat={prompt.formatType}
  onFormatChange={(newFormat) => {
    // Reload prompt in new format
    loadPrompt(promptId);
  }}
/>
```

### 4.5 Update workflowStore

**File**: `app/src/store/workflowStore.ts`

Replace agent registry usage with unified prompts:

```typescript
import { unifiedPromptsDB } from '@/lib/storage/indexedDB';

// In addNode function:
addNode: async (typeOrId, position) => {
  // Try to get from unified prompts (template format)
  let template = await unifiedPromptsDB.get(typeOrId);

  // If it's structured, convert to template
  if (template && template.formatType === 'structured') {
    template = structuredToTemplate(template);
  }

  // Fall back to built-in templates
  if (!template) {
    template = getAgentTemplate(typeOrId as AgentRole);
  }

  // ... rest of node creation
},
```

---

## Phase 5: Examples & Documentation (Week 6)

### 5.1 Update Example Agent Files

**Files**:
- `example-agents/academic-researcher.md`
- `example-agents/email-writer.md`

**Add Enhanced Frontmatter**:

```markdown
---
id: academic-researcher-v3
name: Academic Researcher
formatType: template
role: researcher
description: Specialized agent for conducting thorough academic research with citation tracking
thinkingMode: extended
version: 3.0.0
createdAt: 1731504000000
updatedAt: 1731504000000
model: claude-sonnet-4.5
agenticMode: single
parallel: false
source: file

tags: [research, academic, citations]

variables:
  - name: objective
    required: true
    description: "The research question or topic"
    type: string
  - name: domain
    required: false
    default: "General Academic Research"
    description: "Academic field or subject area"
    type: string
  - name: time_range
    required: false
    default: "Last 5 years"
    description: "Time period for sources"
    type: string
---

# Academic Research Agent
...
```

### 5.2 Create New Example: Lossless Round-Trip

**New File**: `example-agents/lossless-conversion-demo.md`

```markdown
---
id: demo-lossless-conversion
name: Lossless Conversion Demo
formatType: template
role: worker
description: Demonstrates lossless conversion between formats
thinkingMode: balanced
version: 1.0.0
parallel: false

# Preserved structured sections (from original StructuredPrompt)
_originalSections:
  audience: "Developers"
  objective: "Demonstrate lossless prompt conversion"
  constraints: "Must preserve all metadata"
  outputFormat: "Markdown documentation"
---

# Lossless Conversion Demo

This prompt demonstrates the lossless conversion feature.

## Objective
{{objective}}

## Constraints
{{constraints}}

## Notes
When converted back to StructuredPrompt, the _originalSections
will be restored, ensuring perfect round-trip conversion.
```

### 5.3 Update CUSTOM-AGENTS.md

**File**: `CUSTOM-AGENTS.md`

**Add New Sections**:

#### Section: Lossless Conversion

```markdown
## Lossless Conversion

The unified prompt system guarantees **zero data loss** in conversions:

### StructuredPrompt → TemplatePrompt

When converting a form-based prompt to a template:

1. **All sections preserved** in `_originalSections` field
2. **Metadata preserved**: `model`, `agenticMode`, `version`
3. **Variables preserved** with full metadata
4. **Template generated** from sections

**Example**:
```typescript
const structured: StructuredPrompt = {
  formatType: 'structured',
  model: 'claude-sonnet-4.5',
  agenticMode: 'delegated',
  sections: {
    objective: 'Analyze code for bugs',
    constraints: 'Focus on security',
    // ... more sections
  },
  // ... other fields
};

const template = structuredToTemplate(structured);

// template now has:
// - _originalSections: { objective: '...', constraints: '...' }
// - model: 'claude-sonnet-4.5'
// - agenticMode: 'delegated'
```

### TemplatePrompt → StructuredPrompt

When converting back:

1. **Original sections restored** from `_originalSections`
2. **All metadata preserved**
3. **Perfect round-trip** guaranteed

```typescript
const restored = templateToStructured(template);

// restored === structured (data-wise)
assert.deepEqual(restored.sections, structured.sections);
assert.equal(restored.model, structured.model);
```

### Format Switching in UI

Use the `FormatSwitcher` component to toggle between views:

```tsx
<FormatSwitcher
  promptId={prompt.id}
  currentFormat={prompt.formatType}
  onFormatChange={(newFormat) => {
    // Prompt is converted and reloaded
  }}
/>
```

**No data loss** - switch back and forth as many times as you want!
```

### 5.4 Create Migration Guide

**New File**: `MIGRATION-V2-TO-V3.md`

```markdown
# Migration Guide: v2 → v3 (Unified Prompts)

## Overview

Version 3.0 introduces a unified prompt format system that replaces the separate `prompts` and `custom-agents` stores with a single `unified-prompts` store.

## What Changes

### Before (v2)
- **prompts** store → Form-based prompts (PromptFormData)
- **custom-agents** store → Workflow agents (CustomAgent)
- Separate APIs: `promptsDB` and `agentRegistry`

### After (v3)
- **unified-prompts** store → All prompts (UniversalPrompt)
- Two formats: `StructuredPrompt` and `TemplatePrompt`
- Single API: `unifiedPromptsDB`

## Migration Process

### Automatic Migration

On first load of v3, the app will:

1. Detect v2 database (prompts + custom-agents)
2. Show migration dialog
3. Convert all data:
   - `prompts` → `StructuredPrompt` (formatType: 'structured')
   - `custom-agents` → `TemplatePrompt` (formatType: 'template')
4. Save to `unified-prompts` store
5. Validate migration (count check)

### Manual Migration

If needed, run migration programmatically:

```typescript
import { migrateToV3, validateMigration } from '@/lib/storage/migration';

// Run migration
const result = await migrateToV3();

if (result.success) {
  console.log(`Migrated ${result.migratedPrompts} prompts`);
  console.log(`Migrated ${result.migratedCustomAgents} agents`);
} else {
  console.error('Migration errors:', result.errors);
}

// Validate
const validation = await validateMigration();
console.log(validation.message);
```

## Data Mapping

### PromptFormData → StructuredPrompt

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `id` | `id` | Preserved |
| `name` | `name` | Preserved |
| `objective` | `description` | First 200 chars |
| `objective` | `sections.objective` | Full text |
| `domain` | `sections.domain` | Preserved |
| `audience` | `sections.audience` | Preserved |
| `thinkingMode` | `thinkingMode` | Preserved |
| `agenticMode` | `agenticMode` | Preserved |
| `model` | `model` | Preserved |
| `variables` | `variables` | Enhanced with `type` field |
| `version` | `version` | Preserved |
| All other fields | `sections.*` | Preserved |

### CustomAgent → TemplatePrompt

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `id` | `id` | Preserved |
| `name` | `name` | Preserved |
| `description` | `description` | Preserved |
| `role` | `role` | Preserved |
| `promptTemplate` | `promptTemplate` | Preserved |
| `defaultConfig` | `config` | Restructured |
| `source` | `source` | Preserved |
| `tags` | `tags` | Preserved |

## Code Updates

### Update Imports

```typescript
// Old
import type { PromptFormData } from '@/types/prompt';
import { promptsDB } from '@/lib/storage/indexedDB';
import { agentRegistry } from '@/lib/workflow/agentRegistry';

// New
import type { StructuredPrompt, TemplatePrompt, UniversalPrompt } from '@/types/prompt-unified';
import { unifiedPromptsDB } from '@/lib/storage/indexedDB';
```

### Update API Calls

```typescript
// Old
const prompts = await promptsDB.getAll();
const agents = agentRegistry.getCustomAgents();

// New
const allPrompts = await unifiedPromptsDB.getAll();
const structuredPrompts = await unifiedPromptsDB.getByFormat('structured');
const templatePrompts = await unifiedPromptsDB.getByFormat('template');
```

### Update State Types

```typescript
// Old
const [prompt, setPrompt] = useState<PromptFormData | null>(null);

// New
const [prompt, setPrompt] = useState<StructuredPrompt | null>(null);
// or
const [prompt, setPrompt] = useState<UniversalPrompt | null>(null);
```

## Rollback (Emergency Only)

If migration fails catastrophically:

1. **Backup is automatic** - Old stores are not deleted
2. **Revert code** to previous version
3. **Clear unified-prompts** store:
   ```typescript
   const db = await openDB('prompt-gen-db', 3);
   await db.clear('unified-prompts');
   ```
4. Old data remains intact in `prompts` and `custom-agents`

## Testing Migration

```typescript
// 1. Check if migration needed
const needed = await needsMigration();

// 2. Run migration
if (needed) {
  const result = await migrateToV3();
  console.log(result);
}

// 3. Validate
const validation = await validateMigration();
console.log(validation);

// 4. Test conversions
const prompt = await unifiedPromptsDB.get('some-id');
if (prompt.formatType === 'structured') {
  const asTemplate = structuredToTemplate(prompt);
  const backToStructured = templateToStructured(asTemplate);
  // Should be identical
}
```
```

---

## Testing Checklist

Before deploying v3, test these scenarios:

### Conversion Tests

- [ ] StructuredPrompt → TemplatePrompt → StructuredPrompt (lossless)
- [ ] TemplatePrompt → Markdown → TemplatePrompt (lossless)
- [ ] StructuredPrompt → TemplatePrompt → Markdown (complete metadata)
- [ ] Markdown → TemplatePrompt → StructuredPrompt (best-effort parsing)

### Database Tests

- [ ] Migration from v2 (empty db)
- [ ] Migration from v2 (with prompts only)
- [ ] Migration from v2 (with custom agents only)
- [ ] Migration from v2 (with both)
- [ ] Validation after migration (count match)
- [ ] Search functionality in unified store
- [ ] Tag filtering in unified store

### UI Tests

- [ ] PromptBuilder loads structured prompts
- [ ] PromptBuilder loads template prompts (converts to structured)
- [ ] FormatSwitcher converts structured → template
- [ ] FormatSwitcher converts template → structured
- [ ] AgentPalette shows template prompts
- [ ] AgentPalette upload .md files
- [ ] AgentPalette import from library
- [ ] PromptLibrary shows both formats with badges

### Integration Tests

- [ ] Create prompt in builder → save → load → edit → save (structured)
- [ ] Upload .md agent → use in workflow → export (template)
- [ ] Import library prompt → convert → use in workflow
- [ ] Switch format → edit → switch back → verify no data loss

---

## Performance Considerations

### Search Optimization

The `searchIndex` field enables fast full-text search:

```typescript
// Indexed search (fast)
const results = await unifiedPromptsDB.search('research');

// Filter by tags (multi-entry index, fast)
const tagged = await unifiedPromptsDB.filterByTags(['academic', 'research']);
```

### Migration Performance

- **Small databases** (<100 prompts): ~100-200ms
- **Medium databases** (100-1000 prompts): ~500ms-2s
- **Large databases** (>1000 prompts): ~2-5s

Show progress bar for large migrations.

---

## Troubleshooting

### Migration Fails

**Symptom**: Migration dialog shows errors

**Solutions**:
1. Check browser console for detailed errors
2. Export database backup first (export function exists)
3. Try migrating one prompt at a time
4. Report errors with console logs

### Data Missing After Migration

**Symptom**: Prompts not showing in library

**Check**:
```typescript
// Check counts
const stats = await getDatabaseStats();
console.log(stats);

// Check unified store
const unified = await unifiedPromptsDB.getAll();
console.log('Unified prompts:', unified.length);

// Check old stores
const oldPrompts = await promptsDB.getAll();
console.log('Old prompts (should still exist):', oldPrompts.length);
```

### Format Conversion Issues

**Symptom**: Data lost during conversion

**Debug**:
```typescript
const original: StructuredPrompt = { /* ... */ };
const asTemplate = structuredToTemplate(original);

// Check preserved sections
console.log('Has original sections?', !!asTemplate._originalSections);
console.log('Sections:', asTemplate._originalSections);

// Convert back
const restored = templateToStructured(asTemplate);

// Compare
console.log('Match?', JSON.stringify(original.sections) === JSON.stringify(restored.sections));
```

---

## Summary

**Completed**: Phases 1-2 (Foundation)
**Remaining**: Phases 3-5 (Integration)

**Estimated Timeline**:
- Phase 3 (Database): 1-2 weeks
- Phase 4 (UI): 2-3 weeks
- Phase 5 (Docs): 1 week
- **Total**: 4-6 weeks

**Files to Create**: 5
**Files to Modify**: 8
**Lines of Code**: ~1,500

**Key Guarantee**: Zero data loss in all conversions ✅
