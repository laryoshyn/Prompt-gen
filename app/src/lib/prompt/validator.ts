/**
 * Prompt Validation Utilities
 *
 * Provides comprehensive validation for all prompt formats to ensure:
 * - Required fields are present
 * - Data types are correct
 * - Business rules are enforced
 * - Format-specific constraints are met
 *
 * @version 3.0.0
 * @since 2025-11-12
 */

import type {
  StructuredPrompt,
  TemplatePrompt,
  UniversalPrompt,
  EnhancedVariable,
  ValidationError,
  ValidationResult,
  PromptSections,
} from '@/types/prompt-unified';
import type { AgentRole } from '@/types/workflow';

// ============================================================================
// Constants
// ============================================================================

const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 100;
const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 500;
const MIN_TEMPLATE_LENGTH = 50;
const MAX_TEMPLATE_LENGTH = 50000;
const MIN_SECTION_LENGTH = 10;

const VALID_AGENT_ROLES: AgentRole[] = [
  'orchestrator',
  'architect',
  'critic',
  'red-team',
  'researcher',
  'coder',
  'tester',
  'writer',
  'worker',
  'finalizer',
  'loop',
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a validation error
 */
function createError(
  field: string,
  message: string,
  severity: 'error' | 'warning' = 'error'
): ValidationError {
  return { field, message, severity };
}

/**
 * Check if a string is empty or whitespace-only
 */
function isEmpty(value: string | undefined): boolean {
  return !value || value.trim().length === 0;
}

/**
 * Check if value is within range
 */
function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

// ============================================================================
// Variable Validation
// ============================================================================

/**
 * Validate a single variable definition
 */
export function validateVariable(variable: EnhancedVariable): ValidationError[] {
  const errors: ValidationError[] = [];

  // Name is required
  if (isEmpty(variable.name)) {
    errors.push(createError('variable.name', 'Variable name is required'));
  }

  // Name must be valid identifier
  if (variable.name && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable.name)) {
    errors.push(
      createError(
        'variable.name',
        `Invalid variable name "${variable.name}". Must start with letter/underscore and contain only alphanumeric/underscore characters.`
      )
    );
  }

  // Type-specific validation
  if (variable.type) {
    switch (variable.type) {
      case 'number':
        if (variable.defaultValue && isNaN(Number(variable.defaultValue))) {
          errors.push(
            createError('variable.defaultValue', `Default value must be a number for type "number"`)
          );
        }
        if (variable.min !== undefined && variable.max !== undefined && variable.min > variable.max) {
          errors.push(createError('variable.min', 'Minimum value cannot be greater than maximum'));
        }
        break;

      case 'boolean':
        if (
          variable.defaultValue &&
          variable.defaultValue !== 'true' &&
          variable.defaultValue !== 'false'
        ) {
          errors.push(
            createError('variable.defaultValue', `Default value must be "true" or "false" for type "boolean"`)
          );
        }
        break;

      case 'json':
        if (variable.defaultValue) {
          try {
            JSON.parse(variable.defaultValue);
          } catch {
            errors.push(createError('variable.defaultValue', 'Default value must be valid JSON'));
          }
        }
        break;
    }
  }

  // Pattern validation
  if (variable.pattern) {
    try {
      new RegExp(variable.pattern);
    } catch {
      errors.push(createError('variable.pattern', 'Invalid regular expression pattern'));
    }
  }

  // Enum validation
  if (variable.enum && variable.enum.length === 0) {
    errors.push(createError('variable.enum', 'Enum must have at least one value'));
  }

  if (variable.enum && variable.defaultValue && !variable.enum.includes(variable.defaultValue)) {
    errors.push(
      createError('variable.defaultValue', 'Default value must be one of the enum values')
    );
  }

  return errors;
}

/**
 * Validate all variables in a prompt
 */
export function validateVariables(variables: EnhancedVariable[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const names = new Set<string>();

  variables.forEach((variable, index) => {
    // Check for duplicates
    if (names.has(variable.name)) {
      errors.push(
        createError(`variables[${index}].name`, `Duplicate variable name: ${variable.name}`)
      );
    } else {
      names.add(variable.name);
    }

    // Validate individual variable
    const varErrors = validateVariable(variable);
    errors.push(...varErrors.map(e => ({ ...e, field: `variables[${index}].${e.field}` })));
  });

  return errors;
}

/**
 * Extract variables from template and validate they're defined
 */
export function validateTemplateVariables(
  template: string,
  variables: EnhancedVariable[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const definedVars = new Set(variables.map(v => v.name));

  // Extract all {{variable}} placeholders
  const variableRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*(?:\|[^}]+)?)\}\}/g;
  const usedVars = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = variableRegex.exec(template)) !== null) {
    // Extract variable name (before | if present)
    const varName = match[1].split('|')[0].trim();
    usedVars.add(varName);

    // Check if variable is defined
    if (!definedVars.has(varName)) {
      errors.push(
        createError(
          'promptTemplate',
          `Variable "{{${varName}}}" is used but not defined in variables array`,
          'warning'
        )
      );
    }
  }

  // Check for unused defined variables
  definedVars.forEach(name => {
    if (!usedVars.has(name)) {
      errors.push(
        createError(
          'variables',
          `Variable "${name}" is defined but never used in template`,
          'warning'
        )
      );
    }
  });

  return errors;
}

// ============================================================================
// Base Validation (Common Fields)
// ============================================================================

/**
 * Validate base prompt fields (common to all formats)
 */
export function validateBase(prompt: UniversalPrompt): ValidationError[] {
  const errors: ValidationError[] = [];

  // ID
  if (isEmpty(prompt.id)) {
    errors.push(createError('id', 'ID is required'));
  }

  // Name
  if (isEmpty(prompt.name)) {
    errors.push(createError('name', 'Name is required'));
  } else if (prompt.name.length < MIN_NAME_LENGTH) {
    errors.push(
      createError('name', `Name must be at least ${MIN_NAME_LENGTH} characters`)
    );
  } else if (prompt.name.length > MAX_NAME_LENGTH) {
    errors.push(
      createError('name', `Name must not exceed ${MAX_NAME_LENGTH} characters`)
    );
  }

  // Description
  if (isEmpty(prompt.description)) {
    errors.push(createError('description', 'Description is required'));
  } else if (prompt.description.length < MIN_DESCRIPTION_LENGTH) {
    errors.push(
      createError('description', `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`)
    );
  } else if (prompt.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(
      createError('description', `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`)
    );
  }

  // Thinking mode
  if (!['minimal', 'balanced', 'extended'].includes(prompt.thinkingMode)) {
    errors.push(
      createError('thinkingMode', 'Thinking mode must be "minimal", "balanced", or "extended"')
    );
  }

  // Variables
  const varErrors = validateVariables(prompt.variables);
  errors.push(...varErrors);

  // Tags
  if (prompt.tags.some(tag => isEmpty(tag))) {
    errors.push(createError('tags', 'Tags cannot be empty strings'));
  }

  // Timestamps
  if (!prompt.createdAt || prompt.createdAt <= 0) {
    errors.push(createError('createdAt', 'Invalid creation timestamp'));
  }

  if (!prompt.updatedAt || prompt.updatedAt <= 0) {
    errors.push(createError('updatedAt', 'Invalid update timestamp'));
  }

  if (prompt.updatedAt < prompt.createdAt) {
    errors.push(createError('updatedAt', 'Update timestamp cannot be before creation timestamp'));
  }

  // Version
  if (!Number.isInteger(prompt.version) || prompt.version < 1) {
    errors.push(createError('version', 'Version must be a positive integer'));
  }

  return errors;
}

// ============================================================================
// StructuredPrompt Validation
// ============================================================================

/**
 * Validate sections in a structured prompt
 */
export function validateSections(sections: PromptSections): ValidationError[] {
  const errors: ValidationError[] = [];
  let filledSections = 0;

  // Check that at least some key sections are filled
  const keySections = ['objective', 'inputsSummary', 'outputFormat', 'constraints'];
  const filledKeySections = keySections.filter(key => !isEmpty(sections[key as keyof PromptSections]));

  if (filledKeySections.length === 0) {
    errors.push(
      createError(
        'sections',
        'At least one key section (objective, inputs, output format, or constraints) must be filled',
        'error'
      )
    );
  }

  // Validate individual section lengths
  Object.entries(sections).forEach(([key, value]) => {
    if (value && value.length > 0) {
      filledSections++;

      if (value.length < MIN_SECTION_LENGTH) {
        errors.push(
          createError(
            `sections.${key}`,
            `Section "${key}" is too short (minimum ${MIN_SECTION_LENGTH} characters)`,
            'warning'
          )
        );
      }
    }
  });

  // Warn if very few sections filled
  if (filledSections < 3) {
    errors.push(
      createError(
        'sections',
        `Only ${filledSections} sections filled. Consider adding more detail for better prompts.`,
        'warning'
      )
    );
  }

  return errors;
}

/**
 * Validate a StructuredPrompt
 */
export function validateStructuredPrompt(prompt: StructuredPrompt): ValidationResult {
  const errors: ValidationError[] = [];

  // Base validation
  errors.push(...validateBase(prompt));

  // Format type
  if (prompt.formatType !== 'structured') {
    errors.push(createError('formatType', 'Format type must be "structured"'));
  }

  // Model
  if (!['claude-sonnet-4.5', 'gpt-4o', 'gemini-2.5'].includes(prompt.model)) {
    errors.push(
      createError('model', 'Model must be "claude-sonnet-4.5", "gpt-4o", or "gemini-2.5"')
    );
  }

  // Agentic mode
  if (!['single', 'delegated', 'orchestrated'].includes(prompt.agenticMode)) {
    errors.push(
      createError('agenticMode', 'Agentic mode must be "single", "delegated", or "orchestrated"')
    );
  }

  // Sections validation
  errors.push(...validateSections(prompt.sections));

  return {
    valid: errors.filter(e => e.severity === 'error').length === 0,
    errors,
  };
}

// ============================================================================
// TemplatePrompt Validation
// ============================================================================

/**
 * Validate a TemplatePrompt
 */
export function validateTemplatePrompt(prompt: TemplatePrompt): ValidationResult {
  const errors: ValidationError[] = [];

  // Base validation
  errors.push(...validateBase(prompt));

  // Format type
  if (prompt.formatType !== 'template') {
    errors.push(createError('formatType', 'Format type must be "template"'));
  }

  // Role
  if (!VALID_AGENT_ROLES.includes(prompt.role)) {
    errors.push(
      createError(
        'role',
        `Invalid role "${prompt.role}". Must be one of: ${VALID_AGENT_ROLES.join(', ')}`
      )
    );
  }

  // Prompt template
  if (isEmpty(prompt.promptTemplate)) {
    errors.push(createError('promptTemplate', 'Prompt template is required'));
  } else if (prompt.promptTemplate.length < MIN_TEMPLATE_LENGTH) {
    errors.push(
      createError(
        'promptTemplate',
        `Prompt template must be at least ${MIN_TEMPLATE_LENGTH} characters`
      )
    );
  } else if (prompt.promptTemplate.length > MAX_TEMPLATE_LENGTH) {
    errors.push(
      createError(
        'promptTemplate',
        `Prompt template must not exceed ${MAX_TEMPLATE_LENGTH} characters`
      )
    );
  }

  // Validate template variables
  errors.push(...validateTemplateVariables(prompt.promptTemplate, prompt.variables));

  // Config validation
  if (!prompt.config) {
    errors.push(createError('config', 'Configuration is required'));
  } else {
    if (typeof prompt.config.parallel !== 'boolean') {
      errors.push(createError('config.parallel', 'Parallel must be a boolean'));
    }

    if (prompt.config.timeout !== undefined) {
      if (!Number.isInteger(prompt.config.timeout) || prompt.config.timeout <= 0) {
        errors.push(createError('config.timeout', 'Timeout must be a positive integer'));
      }
    }

    if (prompt.config.retries !== undefined) {
      if (!Number.isInteger(prompt.config.retries) || prompt.config.retries < 0) {
        errors.push(createError('config.retries', 'Retries must be a non-negative integer'));
      }
    }

    if (prompt.config.maxMemoryMb !== undefined) {
      if (!Number.isInteger(prompt.config.maxMemoryMb) || prompt.config.maxMemoryMb <= 0) {
        errors.push(createError('config.maxMemoryMb', 'Max memory must be a positive integer'));
      }
    }

    if (prompt.config.maxTokens !== undefined) {
      if (!Number.isInteger(prompt.config.maxTokens) || prompt.config.maxTokens <= 0) {
        errors.push(createError('config.maxTokens', 'Max tokens must be a positive integer'));
      }
    }
  }

  // Source validation
  if (!['built-in', 'file', 'converted', 'user'].includes(prompt.source)) {
    errors.push(
      createError('source', 'Source must be "built-in", "file", "converted", or "user"')
    );
  }

  // Optional model validation (if preserved from structured)
  if (prompt.model && !['claude-sonnet-4.5', 'gpt-4o', 'gemini-2.5'].includes(prompt.model)) {
    errors.push(
      createError('model', 'Model must be "claude-sonnet-4.5", "gpt-4o", or "gemini-2.5"')
    );
  }

  // Optional agentic mode validation (if preserved from structured)
  if (
    prompt.agenticMode &&
    !['single', 'delegated', 'orchestrated'].includes(prompt.agenticMode)
  ) {
    errors.push(
      createError('agenticMode', 'Agentic mode must be "single", "delegated", or "orchestrated"')
    );
  }

  return {
    valid: errors.filter(e => e.severity === 'error').length === 0,
    errors,
  };
}

// ============================================================================
// Universal Validation
// ============================================================================

/**
 * Validate any prompt format
 * Routes to appropriate validator based on formatType
 */
export function validatePrompt(prompt: UniversalPrompt): ValidationResult {
  if (prompt.formatType === 'structured') {
    return validateStructuredPrompt(prompt);
  } else {
    return validateTemplatePrompt(prompt);
  }
}

// ============================================================================
// Batch Validation
// ============================================================================

/**
 * Validate multiple prompts and return summary
 */
export function validateBatch(prompts: UniversalPrompt[]): {
  totalPrompts: number;
  validPrompts: number;
  invalidPrompts: number;
  results: Map<string, ValidationResult>;
} {
  const results = new Map<string, ValidationResult>();

  prompts.forEach(prompt => {
    results.set(prompt.id, validatePrompt(prompt));
  });

  const validPrompts = Array.from(results.values()).filter(r => r.valid).length;

  return {
    totalPrompts: prompts.length,
    validPrompts,
    invalidPrompts: prompts.length - validPrompts,
    results,
  };
}

// ============================================================================
// Validation Summary
// ============================================================================

/**
 * Get human-readable validation summary
 */
export function getValidationSummary(result: ValidationResult): string {
  if (result.valid) {
    if (result.errors.length === 0) {
      return 'Prompt is valid with no warnings.';
    } else {
      return `Prompt is valid with ${result.errors.length} warning(s).`;
    }
  } else {
    const errorCount = result.errors.filter(e => e.severity === 'error').length;
    const warningCount = result.errors.filter(e => e.severity === 'warning').length;
    return `Prompt is invalid: ${errorCount} error(s), ${warningCount} warning(s).`;
  }
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return 'No validation errors.';
  }

  const errorsByField = errors.reduce((acc, error) => {
    if (!acc[error.field]) {
      acc[error.field] = [];
    }
    acc[error.field].push(error);
    return acc;
  }, {} as Record<string, ValidationError[]>);

  const lines: string[] = [];

  Object.entries(errorsByField).forEach(([field, fieldErrors]) => {
    lines.push(`\n${field}:`);
    fieldErrors.forEach(error => {
      const icon = error.severity === 'error' ? '❌' : '⚠️';
      lines.push(`  ${icon} ${error.message}`);
    });
  });

  return lines.join('\n');
}
