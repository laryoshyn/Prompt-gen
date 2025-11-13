/**
 * Unified Prompt Format System
 *
 * This module defines a unified architecture for prompts that enables lossless
 * bidirectional conversion between:
 * - StructuredPrompt (form-based editing in Prompt Builder)
 * - TemplatePrompt (template-based workflow agents)
 * - Markdown files (.md format with YAML frontmatter)
 *
 * Key Design Principles:
 * 1. Shared base interface (PromptBase) for common fields
 * 2. Specialized extensions for format-specific features
 * 3. Metadata preservation to enable lossless conversion
 * 4. Discriminated unions for type safety
 *
 * @version 3.0.0
 * @since 2025-11-12
 */

import type { AgentRole } from './workflow';

/**
 * Enhanced variable definition with full metadata
 * Supports type information, defaults, and validation
 */
export interface EnhancedVariable {
  /** Variable name (used in {{name}} placeholders) */
  name: string;

  /** Default value if not provided */
  defaultValue?: string;

  /** Whether this variable must be provided */
  required: boolean;

  /** Human-readable description of the variable's purpose */
  description?: string;

  /** Type hint for validation and UI */
  type?: 'string' | 'number' | 'boolean' | 'json' | 'array';

  /** Validation regex pattern (for string types) */
  pattern?: string;

  /** Minimum value (for number types) */
  min?: number;

  /** Maximum value (for number types) */
  max?: number;

  /** Allowed values (enum) */
  enum?: string[];
}

/**
 * Base interface shared by all prompt formats
 * Contains fields common to both structured and template prompts
 */
export interface PromptBase {
  /** Unique identifier (UUID v4) */
  id: string;

  /** Display name of the prompt */
  name: string;

  /** Brief description of what this prompt does */
  description: string;

  /** Thinking protocol intensity */
  thinkingMode: 'minimal' | 'balanced' | 'extended';

  /** Variable definitions with full metadata */
  variables: EnhancedVariable[];

  /** Categorization tags for organization and search */
  tags: string[];

  /** Creation timestamp (Unix epoch in milliseconds) */
  createdAt: number;

  /** Last update timestamp (Unix epoch in milliseconds) */
  updatedAt: number;

  /** Version number (semantic versioning) */
  version: number;
}

/**
 * Structured sections for form-based prompt editing
 * Maps to discrete input fields in the Prompt Builder UI
 */
export interface PromptSections {
  /** Target audience for the output */
  audience?: string;

  /** Main task or goal description */
  objective?: string;

  /** Scope boundaries and limitations */
  taskScope?: string;

  /** Domain of expertise or specialization */
  domain?: string;

  /** Summary of expected inputs */
  inputsSummary?: string;

  /** Constraints and limitations */
  constraints?: string;

  /** Expected output structure or format */
  outputFormat?: string;

  /** Writing style and tone guidelines */
  styleTone?: string;

  /** Length requirements or limits */
  lengthLimits?: string;

  /** Quality bar and success criteria */
  evaluationBar?: string;

  /** Things to avoid or watch out for */
  risksToAvoid?: string;

  /** Positive examples (what good looks like) */
  examplesPositive?: string;

  /** Negative examples (what to avoid) */
  examplesNegative?: string;

  /** Available tools and how to use them */
  toolset?: string;

  /** Metrics for evaluating success */
  evaluationMetrics?: string;

  /** Requirements for reusability */
  reusabilityNeeds?: string;

  /** Citation policy and requirements */
  citationsPolicy?: string;

  /** Environment constraints and limitations */
  environmentLimits?: string;
}

/**
 * StructuredPrompt - Form-based prompt format
 *
 * Optimized for:
 * - Form-based editing in Prompt Builder
 * - Structured field-level editing
 * - Search and filtering by specific fields
 * - Versioning and history tracking
 *
 * Used by:
 * - Prompt Builder UI
 * - Prompt Library
 * - Export to markdown
 */
export interface StructuredPrompt extends PromptBase {
  /** Type discriminator for TypeScript narrowing */
  formatType: 'structured';

  /** Target LLM model */
  model: 'claude-sonnet-4.5' | 'gpt-4o' | 'gemini-2.5';

  /** Agentic orchestration mode */
  agenticMode: 'single' | 'delegated' | 'orchestrated';

  /** Structured sections (discrete fields) */
  sections: PromptSections;
}

/**
 * Configuration for template-based prompts
 * Controls runtime behavior in workflow execution
 */
export interface TemplateConfig {
  /** Enable parallel tool execution (Anthropic +54% performance) */
  parallel: boolean;

  /** Maximum execution time in milliseconds */
  timeout?: number;

  /** Number of retry attempts on failure */
  retries?: number;

  /** Memory limit in MB */
  maxMemoryMb?: number;

  /** Token budget for LLM calls */
  maxTokens?: number;
}

/**
 * TemplatePrompt - Template-based prompt format
 *
 * Optimized for:
 * - Workflow execution and agent orchestration
 * - Portable markdown file storage
 * - Role-based agent templates
 * - Integration with multi-agent systems
 *
 * Used by:
 * - Workflow Builder
 * - Agent Palette
 * - .md file import/export
 * - Custom agent system
 */
export interface TemplatePrompt extends PromptBase {
  /** Type discriminator for TypeScript narrowing */
  formatType: 'template';

  /** Agent role in workflow (11 pre-defined + custom) */
  role: AgentRole;

  /** Raw prompt template with {{variable}} placeholders */
  promptTemplate: string;

  /** Runtime configuration */
  config: TemplateConfig;

  /** Source of this template */
  source: 'built-in' | 'file' | 'converted' | 'user';

  /** Original filename if loaded from file */
  originalFileName?: string;

  // ===== Metadata Preservation for Lossless Conversion =====

  /**
   * Target LLM model (preserved if converted from StructuredPrompt)
   * Used when executing this template in workflows
   */
  model?: 'claude-sonnet-4.5' | 'gpt-4o' | 'gemini-2.5';

  /**
   * Agentic orchestration mode (preserved if converted from StructuredPrompt)
   * Determines how this agent delegates to sub-agents
   */
  agenticMode?: 'single' | 'delegated' | 'orchestrated';

  /**
   * Original structured sections (preserved for lossless round-trip)
   * Enables conversion back to StructuredPrompt without data loss
   * @internal
   */
  _originalSections?: PromptSections;
}

/**
 * Union type for all prompt formats
 * Use TypeScript discriminated unions for type-safe handling
 *
 * @example
 * function handlePrompt(prompt: UniversalPrompt) {
 *   if (prompt.formatType === 'structured') {
 *     // TypeScript knows prompt is StructuredPrompt
 *     console.log(prompt.sections.objective);
 *   } else {
 *     // TypeScript knows prompt is TemplatePrompt
 *     console.log(prompt.promptTemplate);
 *   }
 * }
 */
export type UniversalPrompt = StructuredPrompt | TemplatePrompt;

/**
 * Storage format for IndexedDB
 * Wraps the actual prompt data with search indexing
 */
export interface StoredPrompt {
  /** Primary key (same as prompt.id) */
  id: string;

  /** Format type for filtering */
  formatType: 'structured' | 'template';

  /** The actual prompt data */
  data: UniversalPrompt;

  /** Concatenated text for full-text search */
  searchIndex: string;

  /** Tags for multi-entry index */
  tags: string[];

  /** Timestamp for sorting */
  createdAt: number;
  updatedAt: number;
}

/**
 * Conversion metadata tracking
 * Logs the conversion history for debugging and auditing
 */
export interface ConversionLog {
  /** Unique log entry ID */
  id: string;

  /** Prompt being converted */
  promptId: string;

  /** Conversion direction */
  from: 'structured' | 'template' | 'markdown';
  to: 'structured' | 'template' | 'markdown';

  /** Timestamp of conversion */
  timestamp: number;

  /** Whether conversion was lossless */
  lossless: boolean;

  /** Fields that were lost (if any) */
  lostFields?: string[];

  /** Conversion warnings */
  warnings?: string[];
}

/**
 * Type guards for narrowing UniversalPrompt
 */
export function isStructuredPrompt(prompt: UniversalPrompt): prompt is StructuredPrompt {
  return prompt.formatType === 'structured';
}

export function isTemplatePrompt(prompt: UniversalPrompt): prompt is TemplatePrompt {
  return prompt.formatType === 'template';
}

/**
 * Type guard for checking if template has preserved sections
 * (i.e., was converted from structured and can be losslessly converted back)
 */
export function hasOriginalSections(prompt: TemplatePrompt): boolean {
  return !!prompt._originalSections && Object.keys(prompt._originalSections).length > 0;
}

/**
 * Default values for new prompts
 */
export const DEFAULT_PROMPT_BASE: Omit<PromptBase, 'id' | 'name' | 'description' | 'createdAt' | 'updatedAt'> = {
  thinkingMode: 'balanced',
  variables: [],
  tags: [],
  version: 1,
};

export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  parallel: false,
  timeout: 30000,  // 30 seconds
  retries: 0,
};

/**
 * Validation error types
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
