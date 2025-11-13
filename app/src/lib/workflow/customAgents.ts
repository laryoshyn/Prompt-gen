import type { AgentTemplate, AgentRole } from '@/types/workflow';
import type { PromptFormData } from '@/types/prompt';

/**
 * Custom agent metadata parsed from markdown frontmatter
 */
export interface CustomAgentMetadata {
  name: string;
  role?: AgentRole;
  description: string;
  thinkingMode?: 'minimal' | 'balanced' | 'extended';
  parallel?: boolean;
  tags?: string[];
  domain?: string;
  icon?: string;
  color?: string;
}

/**
 * Custom agent with source tracking
 */
export interface CustomAgent extends AgentTemplate {
  source: 'file' | 'prompt-library' | 'user';
  isCustom: true;
  createdAt: number;
  updatedAt: number;
  originalFileName?: string;
}

/**
 * Parse markdown file with frontmatter to extract agent definition
 *
 * Expected format:
 * ```markdown
 * ---
 * name: Custom Researcher
 * role: researcher
 * description: Specialized academic researcher
 * thinkingMode: extended
 * parallel: true
 * tags: [research, academic]
 * domain: Academic Research
 * ---
 *
 * # Prompt Template
 *
 * You are a specialized academic researcher...
 * {{objective}}
 * {{domain}}
 * ```
 */
export function parseAgentMarkdown(content: string, fileName?: string): CustomAgent {
  // Split frontmatter and content
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    throw new Error('Invalid markdown format. Expected YAML frontmatter (---\\n...\\n---)');
  }

  const [, frontmatterStr, promptTemplate] = match;

  // Parse YAML-like frontmatter (simple key-value parser)
  const metadata: Partial<CustomAgentMetadata> = {};
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
        .map(v => v.trim())
        .filter(v => v);
    }
    // Parse booleans
    else if (value === 'true') value = true;
    else if (value === 'false') value = false;

    metadata[key as keyof CustomAgentMetadata] = value;
  }

  // Validate required fields
  if (!metadata.name) {
    throw new Error('Missing required field: name');
  }
  if (!metadata.description) {
    throw new Error('Missing required field: description');
  }

  const timestamp = Date.now();
  const id = `custom-${metadata.name?.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`;

  // Default to 'worker' role for custom agents
  const role: AgentRole = metadata.role || 'worker';

  return {
    id,
    role,
    name: metadata.name,
    description: metadata.description,
    promptTemplate: promptTemplate.trim(),
    defaultConfig: {
      thinkingMode: metadata.thinkingMode || 'balanced',
      parallel: metadata.parallel ?? false,
    },
    tags: metadata.tags || ['custom'],
    source: 'file',
    isCustom: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    originalFileName: fileName,
  };
}

/**
 * Convert PromptFormData from Prompt Library to CustomAgent
 */
export function promptFormDataToAgent(prompt: PromptFormData): CustomAgent {
  // Build prompt template from form data
  const sections: string[] = [];

  // Role and Objective
  sections.push(`You are a specialized agent for the following task:`);
  sections.push(`\n## Objective\n${prompt.objective}`);

  if (prompt.domain) {
    sections.push(`\n## Domain\n${prompt.domain}`);
  }

  if (prompt.audience) {
    sections.push(`\n## Audience\n${prompt.audience}`);
  }

  if (prompt.taskScope) {
    sections.push(`\n## Task Scope\n${prompt.taskScope}`);
  }

  // Inputs
  if (prompt.inputsSummary) {
    sections.push(`\n## Inputs\n${prompt.inputsSummary}`);
  }

  // Constraints
  if (prompt.constraints) {
    sections.push(`\n## Constraints\n${prompt.constraints}`);
  }

  // Style and Tone
  if (prompt.styleTone) {
    sections.push(`\n## Style & Tone\n${prompt.styleTone}`);
  }

  // Length Limits
  if (prompt.lengthLimits) {
    sections.push(`\n## Length Requirements\n${prompt.lengthLimits}`);
  }

  // Output Format
  if (prompt.outputFormat) {
    sections.push(`\n## Output Format\n${prompt.outputFormat}`);
  }

  // Examples
  if (prompt.examplesPositive) {
    sections.push(`\n## Positive Examples\n${prompt.examplesPositive}`);
  }
  if (prompt.examplesNegative) {
    sections.push(`\n## Examples to Avoid\n${prompt.examplesNegative}`);
  }

  // Tools
  if (prompt.toolset) {
    sections.push(`\n## Available Tools\n${prompt.toolset}`);
  }

  // Evaluation
  if (prompt.evaluationBar) {
    sections.push(`\n## Quality Bar\n${prompt.evaluationBar}`);
  }
  if (prompt.evaluationMetrics) {
    sections.push(`\n## Success Metrics\n${prompt.evaluationMetrics}`);
  }

  // Risks
  if (prompt.risksToAvoid) {
    sections.push(`\n## Risks to Avoid\n${prompt.risksToAvoid}`);
  }

  // Citations
  if (prompt.citationsPolicy) {
    sections.push(`\n## Citations Policy\n${prompt.citationsPolicy}`);
  }

  // Environment
  if (prompt.environmentLimits) {
    sections.push(`\n## Environment Constraints\n${prompt.environmentLimits}`);
  }

  // Variables
  if (prompt.variables.length > 0) {
    sections.push('\n## Variables');
    prompt.variables.forEach(v => {
      sections.push(`- **{{${v.name}}}**: ${v.description || 'No description'} ${v.required ? '(Required)' : '(Optional)'}`);
      if (v.defaultValue) {
        sections.push(`  Default: ${v.defaultValue}`);
      }
    });
  }

  // Reusability needs
  if (prompt.reusabilityNeeds) {
    sections.push(`\n## Reusability Requirements\n${prompt.reusabilityNeeds}`);
  }

  const promptTemplate = sections.join('\n');

  return {
    id: `prompt-library-${prompt.id}`,
    role: 'worker', // Default role for library prompts
    name: prompt.name,
    description: prompt.objective.slice(0, 100) + (prompt.objective.length > 100 ? '...' : ''),
    promptTemplate,
    defaultConfig: {
      thinkingMode: prompt.thinkingMode,
      parallel: false,
    },
    tags: [prompt.domain, 'prompt-library', prompt.audience].filter(Boolean),
    source: 'prompt-library',
    isCustom: true,
    createdAt: prompt.createdAt,
    updatedAt: prompt.updatedAt,
  };
}

/**
 * Export CustomAgent to markdown file format
 */
export function exportAgentToMarkdown(agent: CustomAgent): string {
  const frontmatter: string[] = [
    '---',
    `name: ${agent.name}`,
    `role: ${agent.role}`,
    `description: ${agent.description}`,
    `thinkingMode: ${agent.defaultConfig.thinkingMode || 'balanced'}`,
    `parallel: ${agent.defaultConfig.parallel || false}`,
    `tags: [${agent.tags.join(', ')}]`,
  ];

  if (agent.source === 'prompt-library') {
    frontmatter.push('source: prompt-library');
  }

  frontmatter.push('---');
  frontmatter.push('');
  frontmatter.push(agent.promptTemplate);

  return frontmatter.join('\n');
}

/**
 * Validate agent template structure
 */
export function validateAgent(agent: Partial<CustomAgent>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!agent.name || agent.name.trim() === '') {
    errors.push('Agent name is required');
  }

  if (!agent.description || agent.description.trim() === '') {
    errors.push('Agent description is required');
  }

  if (!agent.promptTemplate || agent.promptTemplate.trim() === '') {
    errors.push('Prompt template is required');
  }

  if (!agent.role) {
    errors.push('Agent role is required');
  }

  if (agent.promptTemplate && agent.promptTemplate.length < 50) {
    errors.push('Prompt template seems too short (minimum 50 characters)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
