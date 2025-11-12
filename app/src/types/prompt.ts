export interface Variable {
  name: string;
  defaultValue?: string;
  required: boolean;
  description?: string;
}

export interface PromptFormData {
  // Core config
  model: 'claude-sonnet-4.5' | 'gpt-4o' | 'gemini-2.5';
  audience: string;
  objective: string;
  taskScope: string;
  domain: string;

  // Advanced settings
  thinkingMode: 'minimal' | 'balanced' | 'extended';
  agenticMode: 'single' | 'delegated' | 'orchestrated';

  // Content - Required
  inputsSummary: string;
  constraints: string;
  outputFormat: string;
  styleTone: string;
  lengthLimits: string;
  evaluationBar: string;
  risksToAvoid: string;

  // Content - Optional
  examplesPositive?: string;
  examplesNegative?: string;
  toolset?: string;
  evaluationMetrics?: string;
  reusabilityNeeds?: string;
  citationsPolicy?: string;
  environmentLimits?: string;

  // Reusability
  variables: Variable[];

  // Metadata
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  content: Partial<PromptFormData>;
}
