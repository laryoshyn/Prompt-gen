import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { PromptFormData } from '@/types/prompt';

interface PromptStore {
  // Current prompt being edited
  currentPrompt: PromptFormData | null;

  // Saved prompts (will be synced to IndexedDB)
  savedPrompts: PromptFormData[];

  // Generated markdown preview
  generatedMarkdown: string;

  // Actions
  setCurrentPrompt: (prompt: PromptFormData) => void;
  updateField: <K extends keyof PromptFormData>(
    field: K,
    value: PromptFormData[K]
  ) => void;
  createNewPrompt: () => void;
  generateMarkdown: () => void;

  // Auto-save tracking
  isDirty: boolean;
  lastSaved: number | null;
}

const createDefaultPrompt = (): PromptFormData => ({
  id: crypto.randomUUID(),
  name: 'Untitled Prompt',
  version: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),

  model: 'claude-sonnet-4.5',
  audience: '',
  objective: '',
  taskScope: '',
  domain: '',
  thinkingMode: 'balanced',
  agenticMode: 'single',

  inputsSummary: '',
  constraints: '',
  outputFormat: '',
  styleTone: 'Professional',
  lengthLimits: '',
  evaluationBar: '',
  risksToAvoid: '',

  examplesPositive: '',
  examplesNegative: '',
  toolset: '',
  evaluationMetrics: '',
  reusabilityNeeds: '',
  citationsPolicy: '',
  environmentLimits: '',

  variables: [],
});

export const usePromptStore = create<PromptStore>()(
  persist(
    immer((set, get) => ({
      currentPrompt: null,
      savedPrompts: [],
      generatedMarkdown: '',
      isDirty: false,
      lastSaved: null,

      setCurrentPrompt: (prompt) => set({ currentPrompt: prompt }),

      updateField: (field, value) =>
        set((state) => {
          if (state.currentPrompt) {
            state.currentPrompt[field] = value;
            state.currentPrompt.updatedAt = Date.now();
            state.isDirty = true;
          }
        }),

      createNewPrompt: () =>
        set({
          currentPrompt: createDefaultPrompt(),
          isDirty: false,
        }),

      generateMarkdown: () => {
        const { currentPrompt } = get();
        if (!currentPrompt) {
          set({ generatedMarkdown: '' });
          return;
        }

        const p = currentPrompt;

        // Build comprehensive prompt based on PROMPT-GENERATION-GUIDE.md meta-prompt template
        let markdown = `---
model: ${p.model}
thinking_mode: ${p.thinkingMode}
agentic_mode: ${p.agenticMode}`;

        // Add variables to frontmatter if they exist
        if (p.variables && p.variables.length > 0) {
          markdown += `\nvariables:`;
          p.variables.forEach((v) => {
            markdown += `\n  - name: ${v.name}`;
            if (v.defaultValue) {
              markdown += `\n    default: "${v.defaultValue}"`;
            }
            markdown += `\n    required: ${v.required}`;
            if (v.description) {
              markdown += `\n    description: "${v.description}"`;
            }
          });
        }

        markdown += `\n---\n\n# ${p.name}\n\n`;

        // Role & Context
        if (p.domain && p.audience) {
          markdown += `## Role & Context\n`;
          markdown += `You are a ${p.domain} specialist creating outputs for ${p.audience}.\n\n`;
        }

        // Objective
        if (p.objective) {
          markdown += `## Objective\n${p.objective}\n\n`;
        }

        // Task Scope
        if (p.taskScope) {
          markdown += `## Task Scope\n${p.taskScope}\n\n`;
        }

        // Inputs
        if (p.inputsSummary) {
          markdown += `## Inputs\n${p.inputsSummary}\n\n`;
        }

        // Constraints
        if (p.constraints) {
          markdown += `## Constraints\n${p.constraints}\n\n`;
        }

        // Output Format
        if (p.outputFormat) {
          markdown += `## Output Format\n${p.outputFormat}\n\n`;
        }

        // Style & Tone
        if (p.styleTone) {
          markdown += `## Style & Tone\n${p.styleTone}\n\n`;
        }

        // Length Limits
        if (p.lengthLimits) {
          markdown += `## Length Limits\n${p.lengthLimits}\n\n`;
        }

        // Evaluation Bar
        if (p.evaluationBar) {
          markdown += `## Quality Standard\n${p.evaluationBar}\n\n`;
        }

        // Risks to Avoid
        if (p.risksToAvoid) {
          markdown += `## Risks to Avoid\n${p.risksToAvoid}\n\n`;
        }

        // Optional: Positive Examples
        if (p.examplesPositive) {
          markdown += `## Examples (What Good Looks Like)\n${p.examplesPositive}\n\n`;
        }

        // Optional: Negative Examples
        if (p.examplesNegative) {
          markdown += `## Examples (What to Avoid)\n${p.examplesNegative}\n\n`;
        }

        // Optional: Toolset
        if (p.toolset) {
          markdown += `## Available Tools\n${p.toolset}\n\n`;
          markdown += `Note: Parallelize independent tool calls when possible for better performance.\n\n`;
        }

        // Optional: Evaluation Metrics
        if (p.evaluationMetrics) {
          markdown += `## Evaluation Metrics\n${p.evaluationMetrics}\n\n`;
        }

        // Optional: Citations Policy
        if (p.citationsPolicy) {
          markdown += `## Citations Policy\n${p.citationsPolicy}\n\n`;
        }

        // Optional: Environment Limits
        if (p.environmentLimits) {
          markdown += `## Environment Constraints\n${p.environmentLimits}\n\n`;
        }

        // Thinking Mode Instructions
        if (p.thinkingMode === 'extended') {
          markdown += `## Thinking Protocol\n`;
          markdown += `Use extended thinking for this complex task:\n`;
          markdown += `1. Before acting: Consider multiple approaches, identify edge cases\n`;
          markdown += `2. During execution: Reflect on decisions, validate assumptions\n`;
          markdown += `3. After completion: Verify against quality standard and constraints\n\n`;
        } else if (p.thinkingMode === 'balanced') {
          markdown += `## Thinking Protocol\n`;
          markdown += `Plan your approach in 2-3 bullets before starting, then execute.\n\n`;
        }

        // Agentic Mode Instructions
        if (p.agenticMode === 'delegated') {
          markdown += `## Delegation Protocol\n`;
          markdown += `Follow this review cycle:\n`;
          markdown += `1. **Architect**: Draft initial response\n`;
          markdown += `2. **Critic**: Identify gaps vs quality standard and constraints\n`;
          markdown += `3. **Red-Team**: Test for edge cases and failure modes\n`;
          markdown += `4. **Finalizer**: Incorporate improvements into final output\n\n`;
        } else if (p.agenticMode === 'orchestrated') {
          markdown += `## Orchestration Protocol\n`;
          markdown += `Use Planning → Execution → Review cycles for this multi-step workflow.\n\n`;
        }

        // Verification Checklist
        markdown += `## Verification Checklist\n`;
        markdown += `Before submitting your output, verify:\n`;
        markdown += `- [ ] Objective achieved?\n`;
        markdown += `- [ ] All constraints satisfied?\n`;
        markdown += `- [ ] Output format correct?\n`;
        markdown += `- [ ] Quality standard met?\n`;
        markdown += `- [ ] Risks avoided?\n`;
        if (p.lengthLimits) {
          markdown += `- [ ] Length within limits?\n`;
        }
        if (p.evaluationMetrics) {
          markdown += `- [ ] Evaluation metrics satisfied?\n`;
        }
        markdown += `\n`;

        // Variable Usage Instructions
        if (p.variables && p.variables.length > 0) {
          markdown += `## Variable Usage\n`;
          markdown += `This prompt uses ${p.variables.length} variable${p.variables.length > 1 ? 's' : ''}. When using this prompt, replace the placeholders:\n\n`;
          p.variables.forEach((v) => {
            markdown += `- **{{${v.name}}}**`;
            if (v.description) {
              markdown += ` - ${v.description}`;
            }
            if (v.defaultValue) {
              markdown += ` (default: "${v.defaultValue}")`;
            }
            if (!v.required) {
              markdown += ` (optional)`;
            }
            markdown += `\n`;
          });
          markdown += `\n`;
        }

        // Model-Specific Optimizations
        if (p.model === 'claude-sonnet-4.5') {
          markdown += `---\n\n`;
          markdown += `**Note (Claude 4.x optimization)**: This prompt includes explicit context and motivation for key requirements, formatted output requests, and direct action language for optimal performance.\n`;
        }

        set({ generatedMarkdown: markdown });
      },
    })),
    {
      name: 'prompt-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentPrompt: state.currentPrompt,
        lastSaved: state.lastSaved,
      }),
    }
  )
);
