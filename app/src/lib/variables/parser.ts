import type { Variable } from '@/types/prompt';

/**
 * Variable syntax patterns from PROMPT-GENERATION-GUIDE.md:
 * - {{var}}                    - Required variable
 * - {{var?}}                   - Optional variable
 * - {{var|default="value"}}    - Variable with default value
 */

const VARIABLE_REGEX = /\{\{([a-zA-Z_][a-zA-Z0-9_]*?)(\?)?(\|default=["']([^"']*)["'])?\}\}/g;

export interface ParsedVariable {
  name: string;
  required: boolean;
  defaultValue?: string;
  occurrences: number;
}

/**
 * Parse text to extract all variables with their syntax
 */
export function parseVariables(text: string): ParsedVariable[] {
  const variableMap = new Map<string, ParsedVariable>();

  // Find all variable occurrences
  let match;
  while ((match = VARIABLE_REGEX.exec(text)) !== null) {
    const [, name, optional, _fullDefault, defaultValue] = match;

    const existing = variableMap.get(name);

    if (existing) {
      // Increment occurrence count
      existing.occurrences++;

      // If any occurrence has a default, use it
      if (defaultValue && !existing.defaultValue) {
        existing.defaultValue = defaultValue;
      }

      // If any occurrence is required, mark as required
      if (!optional) {
        existing.required = true;
      }
    } else {
      variableMap.set(name, {
        name,
        required: !optional,
        defaultValue,
        occurrences: 1,
      });
    }
  }

  return Array.from(variableMap.values());
}

/**
 * Convert ParsedVariable to Variable type
 */
export function parsedVariableToVariable(parsed: ParsedVariable): Variable {
  return {
    name: parsed.name,
    defaultValue: parsed.defaultValue,
    required: parsed.required,
    description: `Used ${parsed.occurrences} time${parsed.occurrences > 1 ? 's' : ''} in prompt`,
  };
}

/**
 * Parse all text fields in prompt data to extract variables
 */
export function parseVariablesFromPrompt(promptData: {
  objective?: string;
  taskScope?: string;
  inputsSummary?: string;
  constraints?: string;
  outputFormat?: string;
  styleTone?: string;
  lengthLimits?: string;
  evaluationBar?: string;
  risksToAvoid?: string;
  examplesPositive?: string;
  examplesNegative?: string;
  toolset?: string;
  evaluationMetrics?: string;
  reusabilityNeeds?: string;
  citationsPolicy?: string;
  environmentLimits?: string;
}): Variable[] {
  const allText = [
    promptData.objective,
    promptData.taskScope,
    promptData.inputsSummary,
    promptData.constraints,
    promptData.outputFormat,
    promptData.styleTone,
    promptData.lengthLimits,
    promptData.evaluationBar,
    promptData.risksToAvoid,
    promptData.examplesPositive,
    promptData.examplesNegative,
    promptData.toolset,
    promptData.evaluationMetrics,
    promptData.reusabilityNeeds,
    promptData.citationsPolicy,
    promptData.environmentLimits,
  ]
    .filter((text): text is string => Boolean(text))
    .join('\n');

  const parsedVars = parseVariables(allText);
  return parsedVars.map(parsedVariableToVariable);
}

/**
 * Interpolate variables in text with provided values
 * If a variable is not provided and has no default, keeps the {{var}} syntax
 */
export function interpolateVariables(
  text: string,
  variables: Record<string, string>
): string {
  return text.replace(VARIABLE_REGEX, (match, name, optional, _fullDefault, defaultValue) => {
    // If variable value is provided, use it
    if (variables[name] !== undefined && variables[name] !== '') {
      return variables[name];
    }

    // If default value is specified, use it
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    // If optional and no value/default, return empty string
    if (optional) {
      return '';
    }

    // Otherwise, keep the original syntax (required variable with no value)
    return match;
  });
}

/**
 * Validate that all required variables have values
 */
export function validateVariables(
  text: string,
  variables: Record<string, string>
): { valid: boolean; missing: string[] } {
  const parsed = parseVariables(text);
  const missing: string[] = [];

  for (const variable of parsed) {
    if (variable.required && !variable.defaultValue) {
      if (!variables[variable.name] || variables[variable.name] === '') {
        missing.push(variable.name);
      }
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get variable syntax examples for UI hints
 */
export function getVariableSyntaxExamples(): string[] {
  return [
    '{{variable_name}} - Required variable',
    '{{variable_name?}} - Optional variable',
    '{{variable_name|default="value"}} - Variable with default',
  ];
}

/**
 * Format variable for display in prompt text
 */
export function formatVariable(variable: Variable): string {
  if (variable.defaultValue) {
    return `{{${variable.name}|default="${variable.defaultValue}"}}`;
  }
  if (!variable.required) {
    return `{{${variable.name}?}}`;
  }
  return `{{${variable.name}}}`;
}
