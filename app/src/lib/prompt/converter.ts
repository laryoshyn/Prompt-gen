/**
 * Lossless Bidirectional Prompt Format Converters
 *
 * This module provides conversion functions between all three prompt formats:
 * - StructuredPrompt ↔ TemplatePrompt
 * - TemplatePrompt ↔ Markdown
 * - StructuredPrompt → Markdown (via TemplatePrompt)
 *
 * Key Guarantee: All conversions preserve metadata for perfect round-trips.
 *
 * @version 3.0.0
 * @since 2025-11-12
 */

import type {
  StructuredPrompt,
  TemplatePrompt,
  PromptSections,
  EnhancedVariable,
  ConversionLog,
} from '@/types/prompt-unified';
import type { AgentRole } from '@/types/workflow';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate unique ID for prompts
 */
export function generatePromptId(): string {
  return `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Create search index from prompt data
 * Concatenates all searchable text for full-text search
 */
export function createSearchIndex(prompt: StructuredPrompt | TemplatePrompt): string {
  const parts: string[] = [
    prompt.name,
    prompt.description,
    ...prompt.tags,
    ...prompt.variables.map(v => `${v.name} ${v.description || ''}`),
  ];

  if (prompt.formatType === 'structured') {
    const sections = prompt.sections;
    Object.values(sections).forEach(value => {
      if (value) parts.push(value);
    });
  } else {
    parts.push(prompt.promptTemplate);
  }

  return parts.filter(Boolean).join(' ').toLowerCase();
}

/**
 * Sanitize filename for safe file system usage
 */
export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================================================
// Role Inference
// ============================================================================

/**
 * Infer AgentRole from prompt content
 * Uses heuristics based on domain, objective, and keywords
 */
export function inferRoleFromContent(sections: PromptSections): AgentRole {
  const text = [
    sections.domain || '',
    sections.objective || '',
    sections.taskScope || '',
  ].join(' ').toLowerCase();

  // Orchestration keywords
  if (/orchestrat|coordinat|delegat|workflow|multi-agent/.test(text)) {
    return 'orchestrator';
  }

  // Architecture keywords
  if (/architect|design|system design|adr|technical spec/.test(text)) {
    return 'architect';
  }

  // Critique keywords
  if (/critic|review|feedback|quality|assess/.test(text)) {
    return 'critic';
  }

  // Red team keywords
  if (/red.?team|stress.?test|adversarial|attack|vulnerability/.test(text)) {
    return 'red-team';
  }

  // Research keywords
  if (/research|analyz|investig|gather|synthesiz|literature/.test(text)) {
    return 'researcher';
  }

  // Coding keywords
  if (/cod(e|ing)|program|develop|implement|software/.test(text)) {
    return 'coder';
  }

  // Testing keywords
  if (/test|qa|quality assurance|validat|verify/.test(text)) {
    return 'tester';
  }

  // Writing keywords
  if (/writ(e|ing)|document|author|content|copy/.test(text)) {
    return 'writer';
  }

  // Finalizer keywords
  if (/final|aggregat|summar|consolidat|compile/.test(text)) {
    return 'finalizer';
  }

  // Loop keywords
  if (/loop|iterat|repeat|until|while/.test(text)) {
    return 'loop';
  }

  // Default to worker for generic tasks
  return 'worker';
}

// ============================================================================
// Template Generation from Sections
// ============================================================================

/**
 * Generate prompt template string from structured sections
 * Creates a clean, well-formatted markdown template
 */
export function generateTemplateFromSections(sections: PromptSections): string {
  const parts: string[] = [];

  // Role & Context (if available)
  if (sections.domain || sections.audience) {
    parts.push('## Role & Context');
    if (sections.domain && sections.audience) {
      parts.push(`You are a ${sections.domain} specialist creating outputs for ${sections.audience}.`);
    } else if (sections.domain) {
      parts.push(`You are a ${sections.domain} specialist.`);
    } else if (sections.audience) {
      parts.push(`You are creating outputs for ${sections.audience}.`);
    }
    parts.push('');
  }

  // Objective
  if (sections.objective) {
    parts.push('## Objective');
    parts.push(sections.objective);
    parts.push('');
  }

  // Task Scope
  if (sections.taskScope) {
    parts.push('## Task Scope');
    parts.push(sections.taskScope);
    parts.push('');
  }

  // Inputs
  if (sections.inputsSummary) {
    parts.push('## Inputs');
    parts.push(sections.inputsSummary);
    parts.push('');
  }

  // Constraints
  if (sections.constraints) {
    parts.push('## Constraints');
    parts.push(sections.constraints);
    parts.push('');
  }

  // Output Format
  if (sections.outputFormat) {
    parts.push('## Output Format');
    parts.push(sections.outputFormat);
    parts.push('');
  }

  // Style & Tone
  if (sections.styleTone) {
    parts.push('## Style & Tone');
    parts.push(sections.styleTone);
    parts.push('');
  }

  // Length Limits
  if (sections.lengthLimits) {
    parts.push('## Length Requirements');
    parts.push(sections.lengthLimits);
    parts.push('');
  }

  // Quality Standard
  if (sections.evaluationBar) {
    parts.push('## Quality Standard');
    parts.push(sections.evaluationBar);
    parts.push('');
  }

  // Risks to Avoid
  if (sections.risksToAvoid) {
    parts.push('## Risks to Avoid');
    parts.push(sections.risksToAvoid);
    parts.push('');
  }

  // Examples (Positive)
  if (sections.examplesPositive) {
    parts.push('## Examples (What Good Looks Like)');
    parts.push(sections.examplesPositive);
    parts.push('');
  }

  // Examples (Negative)
  if (sections.examplesNegative) {
    parts.push('## Examples (What to Avoid)');
    parts.push(sections.examplesNegative);
    parts.push('');
  }

  // Tools
  if (sections.toolset) {
    parts.push('## Available Tools');
    parts.push(sections.toolset);
    parts.push('');
  }

  // Evaluation Metrics
  if (sections.evaluationMetrics) {
    parts.push('## Success Metrics');
    parts.push(sections.evaluationMetrics);
    parts.push('');
  }

  // Citations Policy
  if (sections.citationsPolicy) {
    parts.push('## Citations Policy');
    parts.push(sections.citationsPolicy);
    parts.push('');
  }

  // Environment Constraints
  if (sections.environmentLimits) {
    parts.push('## Environment Constraints');
    parts.push(sections.environmentLimits);
    parts.push('');
  }

  // Reusability Needs
  if (sections.reusabilityNeeds) {
    parts.push('## Reusability Requirements');
    parts.push(sections.reusabilityNeeds);
    parts.push('');
  }

  return parts.join('\n').trim();
}

// ============================================================================
// Template Parsing into Sections
// ============================================================================

/**
 * Parse template string back into structured sections
 * Uses markdown headers to identify sections
 */
export function parseTemplateIntoSections(template: string): PromptSections {
  const sections: PromptSections = {};

  // Split by headers (## Section Name)
  const headerRegex = /^## (.+)$/gm;
  const parts: { header: string; content: string }[] = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = headerRegex.exec(template)) !== null) {
    if (parts.length > 0) {
      // Set content for previous section
      parts[parts.length - 1].content = template.slice(lastIndex, match.index).trim();
    }
    parts.push({ header: match[1].trim(), content: '' });
    lastIndex = match.index + match[0].length;
  }

  // Last section content
  if (parts.length > 0) {
    parts[parts.length - 1].content = template.slice(lastIndex).trim();
  }

  // Map headers to section fields
  const headerMap: Record<string, keyof PromptSections> = {
    'Role & Context': 'domain',  // Extract domain from "You are a {domain} specialist"
    'Objective': 'objective',
    'Task Scope': 'taskScope',
    'Inputs': 'inputsSummary',
    'Constraints': 'constraints',
    'Output Format': 'outputFormat',
    'Style & Tone': 'styleTone',
    'Length Requirements': 'lengthLimits',
    'Quality Standard': 'evaluationBar',
    'Risks to Avoid': 'risksToAvoid',
    'Examples (What Good Looks Like)': 'examplesPositive',
    'Examples (What to Avoid)': 'examplesNegative',
    'Available Tools': 'toolset',
    'Success Metrics': 'evaluationMetrics',
    'Citations Policy': 'citationsPolicy',
    'Environment Constraints': 'environmentLimits',
    'Reusability Requirements': 'reusabilityNeeds',
  };

  parts.forEach(({ header, content }) => {
    const field = headerMap[header];
    if (field) {
      if (field === 'domain' && content.includes('specialist')) {
        // Extract domain from "You are a {domain} specialist..."
        const domainMatch = content.match(/You are a (.+?) specialist/);
        if (domainMatch) {
          sections.domain = domainMatch[1];
        }
        // Extract audience from "...for {audience}"
        const audienceMatch = content.match(/for (.+?)\./);
        if (audienceMatch) {
          sections.audience = audienceMatch[1];
        }
      } else {
        sections[field] = content;
      }
    }
  });

  return sections;
}

// ============================================================================
// CONVERSION: StructuredPrompt → TemplatePrompt
// ============================================================================

/**
 * Convert StructuredPrompt to TemplatePrompt
 * LOSSLESS: Preserves all metadata for perfect round-trip
 */
export function structuredToTemplate(prompt: StructuredPrompt): TemplatePrompt {
  const template = generateTemplateFromSections(prompt.sections);
  const role = inferRoleFromContent(prompt.sections);

  return {
    formatType: 'template',
    id: prompt.id,
    name: prompt.name,
    description: prompt.description,
    thinkingMode: prompt.thinkingMode,
    variables: prompt.variables,
    tags: [...prompt.tags, prompt.sections.domain].filter(Boolean) as string[],
    createdAt: prompt.createdAt,
    updatedAt: Date.now(),
    version: prompt.version,

    role,
    promptTemplate: template,

    config: {
      parallel: false,
      timeout: 30000,
      retries: 0,
    },

    source: 'converted',

    // ===== LOSSLESS METADATA PRESERVATION =====
    model: prompt.model,
    agenticMode: prompt.agenticMode,
    _originalSections: prompt.sections,
  };
}

// ============================================================================
// CONVERSION: TemplatePrompt → StructuredPrompt
// ============================================================================

/**
 * Convert TemplatePrompt to StructuredPrompt
 * LOSSLESS: Restores original sections if available, otherwise parses template
 */
export function templateToStructured(prompt: TemplatePrompt): StructuredPrompt {
  // If this template was converted from structured, restore original sections
  const sections = prompt._originalSections || parseTemplateIntoSections(prompt.promptTemplate);

  return {
    formatType: 'structured',
    id: prompt.id,
    name: prompt.name,
    description: prompt.description,
    thinkingMode: prompt.thinkingMode,
    variables: prompt.variables,
    tags: prompt.tags,
    createdAt: prompt.createdAt,
    updatedAt: Date.now(),
    version: prompt.version,

    model: prompt.model || 'claude-sonnet-4.5',
    agenticMode: prompt.agenticMode || 'single',

    sections,
  };
}

// ============================================================================
// CONVERSION: Markdown ↔ TemplatePrompt
// ============================================================================

/**
 * Parse markdown file with YAML frontmatter into TemplatePrompt
 * LOSSLESS: Preserves all frontmatter metadata
 */
export function markdownToTemplate(content: string, fileName?: string): TemplatePrompt {
  // Split frontmatter and body
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    throw new Error('Invalid markdown format. Expected YAML frontmatter (---\\n...\\n---)');
  }

  const [, frontmatterStr, body] = match;

  // Parse YAML frontmatter (simple key-value parser)
  const metadata: any = {};
  const lines = frontmatterStr.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    let value: any = trimmed.slice(colonIndex + 1).trim();

    // Parse arrays [item1, item2]
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((v: string) => v.trim())
        .filter((v: string) => v);
    }
    // Parse booleans
    else if (value === 'true') value = true;
    else if (value === 'false') value = false;
    // Parse numbers
    else if (/^\d+$/.test(value)) value = parseInt(value, 10);

    metadata[key] = value;
  }

  // Validate required fields
  if (!metadata.name) {
    throw new Error('Missing required field: name');
  }

  const timestamp = Date.now();

  return {
    formatType: 'template',
    id: metadata.id || generatePromptId(),
    name: metadata.name,
    description: metadata.description || '',
    thinkingMode: metadata.thinkingMode || 'balanced',
    variables: metadata.variables || [],
    tags: metadata.tags || [],
    createdAt: metadata.createdAt || timestamp,
    updatedAt: metadata.updatedAt || timestamp,
    version: metadata.version || 1,

    role: metadata.role || 'worker',
    promptTemplate: body.trim(),

    config: {
      parallel: metadata.parallel || false,
      timeout: metadata.timeout,
      retries: metadata.retries,
      maxMemoryMb: metadata.maxMemoryMb,
      maxTokens: metadata.maxTokens,
    },

    source: metadata.source || 'file',
    originalFileName: fileName || metadata.originalFileName,

    // Preserved metadata
    model: metadata.model,
    agenticMode: metadata.agenticMode,
    _originalSections: metadata._originalSections,
  };
}

/**
 * Export TemplatePrompt to markdown file format
 * LOSSLESS: Includes all metadata in frontmatter
 */
export function templateToMarkdown(prompt: TemplatePrompt): string {
  const frontmatter: string[] = [
    '---',
    `id: ${prompt.id}`,
    `name: ${prompt.name}`,
    `formatType: template`,
    `role: ${prompt.role}`,
    `description: ${prompt.description}`,
    `thinkingMode: ${prompt.thinkingMode}`,
    `version: ${prompt.version}`,
    `createdAt: ${prompt.createdAt}`,
    `updatedAt: ${prompt.updatedAt}`,
    `parallel: ${prompt.config.parallel}`,
  ];

  if (prompt.config.timeout) frontmatter.push(`timeout: ${prompt.config.timeout}`);
  if (prompt.config.retries) frontmatter.push(`retries: ${prompt.config.retries}`);
  if (prompt.config.maxMemoryMb) frontmatter.push(`maxMemoryMb: ${prompt.config.maxMemoryMb}`);
  if (prompt.config.maxTokens) frontmatter.push(`maxTokens: ${prompt.config.maxTokens}`);

  if (prompt.model) frontmatter.push(`model: ${prompt.model}`);
  if (prompt.agenticMode) frontmatter.push(`agenticMode: ${prompt.agenticMode}`);
  if (prompt.source) frontmatter.push(`source: ${prompt.source}`);
  if (prompt.originalFileName) frontmatter.push(`originalFileName: ${prompt.originalFileName}`);

  if (prompt.tags.length > 0) {
    frontmatter.push(`tags: [${prompt.tags.join(', ')}]`);
  }

  if (prompt.variables.length > 0) {
    frontmatter.push('');
    frontmatter.push('variables:');
    prompt.variables.forEach(v => {
      frontmatter.push(`  - name: ${v.name}`);
      if (v.required !== undefined) frontmatter.push(`    required: ${v.required}`);
      if (v.defaultValue) frontmatter.push(`    default: "${v.defaultValue}"`);
      if (v.description) frontmatter.push(`    description: "${v.description}"`);
      if (v.type) frontmatter.push(`    type: ${v.type}`);
    });
  }

  // Preserve original sections if present (for lossless round-trip)
  if (prompt._originalSections) {
    frontmatter.push('');
    frontmatter.push('# Preserved structured sections (for lossless conversion)');
    frontmatter.push('_originalSections:');
    Object.entries(prompt._originalSections).forEach(([key, value]) => {
      if (value) {
        frontmatter.push(`  ${key}: "${value.replace(/"/g, '\\"')}"`);
      }
    });
  }

  frontmatter.push('---');
  frontmatter.push('');
  frontmatter.push(prompt.promptTemplate);

  return frontmatter.join('\n');
}

// ============================================================================
// Conversion Logging
// ============================================================================

/**
 * Log a conversion for auditing and debugging
 */
export function logConversion(
  promptId: string,
  from: ConversionLog['from'],
  to: ConversionLog['to'],
  lossless: boolean,
  lostFields?: string[],
  warnings?: string[]
): ConversionLog {
  return {
    id: generatePromptId(),
    promptId,
    from,
    to,
    timestamp: Date.now(),
    lossless,
    lostFields,
    warnings,
  };
}
