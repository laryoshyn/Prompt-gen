import { z } from 'zod';

/**
 * Zod validation schema for prompt form data
 * Based on PROMPT-GENERATION-GUIDE.md requirements
 */
export const promptFormSchema = z.object({
  // Metadata
  id: z.string().uuid(),
  name: z.string().min(1, 'Prompt name is required'),
  version: z.number().positive(),
  createdAt: z.number(),
  updatedAt: z.number(),

  // Core Settings - Required
  model: z.enum(['claude-sonnet-4.5', 'gpt-4o', 'gemini-2.5']),
  objective: z
    .string()
    .min(10, 'Objective should be at least 10 characters')
    .max(1000, 'Objective is too long'),
  domain: z
    .string()
    .min(2, 'Domain is required')
    .max(200, 'Domain is too long'),
  audience: z
    .string()
    .min(2, 'Audience is required')
    .max(200, 'Audience is too long'),
  taskScope: z
    .string()
    .min(10, 'Task scope should be at least 10 characters')
    .max(2000, 'Task scope is too long'),

  // Modes
  thinkingMode: z.enum(['minimal', 'balanced', 'extended']),
  agenticMode: z.enum(['single', 'delegated', 'orchestrated']),

  // Content - Required
  inputsSummary: z
    .string()
    .min(5, 'Inputs summary is required')
    .max(1000, 'Inputs summary is too long'),
  constraints: z
    .string()
    .min(5, 'Constraints are required')
    .max(2000, 'Constraints are too long'),
  outputFormat: z
    .string()
    .min(5, 'Output format is required')
    .max(2000, 'Output format is too long'),
  styleTone: z
    .string()
    .min(2, 'Style & tone is required')
    .max(200, 'Style & tone is too long'),
  lengthLimits: z
    .string()
    .min(2, 'Length limits are required')
    .max(200, 'Length limits is too long'),
  evaluationBar: z
    .string()
    .min(5, 'Evaluation bar is required')
    .max(1000, 'Evaluation bar is too long'),
  risksToAvoid: z
    .string()
    .min(5, 'Risks to avoid is required')
    .max(1000, 'Risks to avoid is too long'),

  // Content - Optional
  examplesPositive: z.string().max(5000, 'Examples are too long').optional(),
  examplesNegative: z.string().max(5000, 'Examples are too long').optional(),
  toolset: z.string().max(1000, 'Toolset description is too long').optional(),
  evaluationMetrics: z.string().max(1000, 'Evaluation metrics are too long').optional(),
  reusabilityNeeds: z.string().max(1000, 'Reusability needs are too long').optional(),
  citationsPolicy: z.string().max(500, 'Citations policy is too long').optional(),
  environmentLimits: z.string().max(500, 'Environment limits are too long').optional(),

  // Variables
  variables: z.array(
    z.object({
      name: z.string().min(1, 'Variable name is required'),
      defaultValue: z.string().optional(),
      required: z.boolean(),
      description: z.string().optional(),
    })
  ),
});

export type PromptFormSchema = z.infer<typeof promptFormSchema>;

/**
 * Partial schema for progressive validation (allows empty required fields during editing)
 */
export const promptFormSchemaPartial = promptFormSchema.partial({
  objective: true,
  domain: true,
  audience: true,
  taskScope: true,
  inputsSummary: true,
  constraints: true,
  outputFormat: true,
  styleTone: true,
  lengthLimits: true,
  evaluationBar: true,
  risksToAvoid: true,
});
