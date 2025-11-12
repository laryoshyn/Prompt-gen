import type { PromptFormData } from '@/types/prompt';

/**
 * Extract and parse templates from PROMPT-GENERATION-GUIDE.md
 * Based on the task templates section (lines ~405-497)
 */

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: 'data' | 'code' | 'research' | 'agents' | 'general';
  content: Partial<PromptFormData>;
}

export const GUIDE_TEMPLATES: TemplateDefinition[] = [
  {
    id: 'json-extraction',
    name: 'JSON Data Extraction',
    description: 'Extract structured JSON from unstructured text with validation',
    category: 'data',
    content: {
      objective: 'Extract structured data from unstructured text and output as valid JSON',
      domain: 'Data Extraction',
      audience: 'Data engineers, developers',
      taskScope: 'Parse input text and extract relevant fields into a structured JSON format',
      thinkingMode: 'minimal',
      agenticMode: 'single',
      inputsSummary: 'Unstructured text containing information to be extracted',
      constraints: `- Output must be valid JSON
- Include only fields present in the input
- Use null for missing optional fields
- Maintain data type consistency
- Handle malformed input gracefully`,
      outputFormat: `JSON with strict schema validation:
\`\`\`json
{
  "field_name": "type (string|number|boolean|array|object)",
  ...
}
\`\`\``,
      styleTone: 'Technical and precise',
      lengthLimits: 'Compact JSON, no unnecessary whitespace',
      evaluationBar: 'JSON must parse successfully and match schema',
      risksToAvoid: `- Hallucinating fields not in source
- Type mismatches
- Invalid JSON syntax
- Over-extraction of irrelevant data`,
    },
  },

  {
    id: 'code-refactoring',
    name: 'Code Refactoring',
    description: 'Refactor code for maintainability while preserving functionality',
    category: 'code',
    content: {
      objective: 'Refactor code to improve readability, maintainability, and performance while preserving exact functionality',
      domain: 'Software Engineering',
      audience: 'Software developers',
      taskScope: 'Analyze existing code, identify improvement opportunities, apply refactoring patterns without changing behavior',
      thinkingMode: 'balanced',
      agenticMode: 'single',
      inputsSummary: 'Source code file(s) to be refactored',
      constraints: `- Preserve exact functionality (no behavior changes)
- Maintain backward compatibility
- Follow language best practices and idioms
- Keep tests passing
- Document significant changes`,
      outputFormat: `Refactored code with:
1. Updated source code
2. Change summary with rationale
3. Migration notes if API changes
4. Test verification report`,
      styleTone: 'Professional, maintainable code with clear comments',
      lengthLimits: 'Similar to original, may be slightly longer for clarity',
      evaluationBar: 'All tests pass, code metrics improve (cyclomatic complexity, duplication)',
      risksToAvoid: `- Breaking existing functionality
- Introducing new dependencies unnecessarily
- Over-engineering simple code
- Breaking backward compatibility`,
    },
  },

  {
    id: 'research-synthesis',
    name: 'Research Synthesis',
    description: 'Synthesize research findings from multiple sources into actionable insights',
    category: 'research',
    content: {
      objective: 'Gather information from multiple sources, analyze findings, and synthesize into actionable recommendations',
      domain: 'Research and Analysis',
      audience: 'Decision makers, technical leads',
      taskScope: 'Research specific topic, evaluate sources, identify patterns, provide evidence-based recommendations',
      thinkingMode: 'extended',
      agenticMode: 'single',
      inputsSummary: 'Research question or topic to investigate',
      constraints: `- Cite all sources with URLs
- Prioritize recent information (2024-2025)
- Use credible sources (official docs, research papers, established blogs)
- Note confidence levels for findings
- Identify conflicting information`,
      outputFormat: `Research report with:
## Executive Summary
- Key findings (3-5 bullets)
- Recommendations based on evidence

## Detailed Findings
For each finding:
- **Finding**: What was discovered
- **Source**: URL and publication date
- **Evidence**: Supporting data
- **Confidence**: High/Medium/Low

## Analysis
- Patterns and trends
- Comparisons of approaches
- Trade-offs and considerations

## Recommendations
- Actionable next steps
- Priority ranking
- Implementation considerations

## References
- Numbered list with full citations`,
      styleTone: 'Analytical and evidence-based',
      lengthLimits: '1500-3000 words, comprehensive but focused',
      evaluationBar: 'All claims backed by cited sources, recommendations are actionable',
      risksToAvoid: `- Relying on outdated information
- Making claims without evidence
- Ignoring conflicting data
- Confirmation bias
- Recommendations without context`,
    },
  },

  {
    id: 'agent-orchestration',
    name: 'Multi-Agent Orchestration',
    description: 'Coordinate multiple specialized agents for complex workflows',
    category: 'agents',
    content: {
      objective: 'Orchestrate a multi-agent workflow where specialized agents collaborate to solve a complex problem',
      domain: 'AI Agent Systems',
      audience: 'AI engineers, system architects',
      taskScope: 'Define agent roles, manage artifact passing, coordinate execution, aggregate results',
      thinkingMode: 'extended',
      agenticMode: 'orchestrated',
      inputsSummary: 'Complex task requiring multiple specialized capabilities',
      constraints: `- Clear agent responsibilities (no overlap)
- Explicit artifact passing between agents
- Validation after each agent completes
- Maximum 10 agents in workflow
- Timeout limits per agent`,
      outputFormat: `Multi-agent workflow with:
1. **Workflow Plan**:
   - Agent sequence or DAG
   - Dependencies between agents
   - Artifact schema

2. **Agent Definitions**:
   - Role and responsibilities
   - Input requirements
   - Output artifacts
   - Success criteria

3. **Orchestration Protocol**:
   - Execution order
   - Error handling
   - State management

4. **Final Deliverable**:
   - Aggregated results from all agents`,
      styleTone: 'Systematic and structured',
      lengthLimits: 'Comprehensive workflow documentation',
      evaluationBar: 'All agents complete successfully, artifacts validated, final deliverable meets objective',
      risksToAvoid: `- Circular dependencies between agents
- Unclear artifact schemas
- Missing error handling
- Poor state management
- Agent responsibilities overlap`,
    },
  },

  {
    id: 'api-documentation',
    name: 'API Documentation Generator',
    description: 'Generate comprehensive API documentation from code',
    category: 'code',
    content: {
      objective: 'Generate complete API documentation with examples and best practices',
      domain: 'API Development',
      audience: 'API consumers, frontend developers',
      taskScope: 'Document all endpoints, parameters, responses, error codes, and provide usage examples',
      thinkingMode: 'balanced',
      agenticMode: 'single',
      inputsSummary: 'API source code or OpenAPI specification',
      constraints: `- Document all public endpoints
- Include request/response examples
- Document error codes and handling
- Provide authentication details
- Include rate limiting information`,
      outputFormat: `For each endpoint:
## \`METHOD /path\`

**Description**: Brief description

**Authentication**: Required/Optional

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|

**Request Example**:
\`\`\`json
{...}
\`\`\`

**Response**: 200 OK
\`\`\`json
{...}
\`\`\`

**Errors**:
- 400: Bad Request
- 401: Unauthorized
- ...`,
      styleTone: 'Clear, technical, with helpful examples',
      lengthLimits: 'Complete coverage, concise explanations',
      evaluationBar: 'All endpoints documented, examples work, no ambiguity',
      risksToAvoid: `- Outdated examples
- Missing error cases
- Ambiguous parameter descriptions
- Incomplete authentication info`,
    },
  },

  {
    id: 'technical-writing',
    name: 'Technical Tutorial Writer',
    description: 'Create step-by-step technical tutorials with examples',
    category: 'general',
    content: {
      objective: 'Create comprehensive step-by-step tutorials for technical topics',
      domain: 'Technical Writing',
      audience: 'Developers, learners',
      taskScope: 'Explain concept, provide working examples, include troubleshooting',
      thinkingMode: 'balanced',
      agenticMode: 'single',
      inputsSummary: 'Topic to explain and target audience level',
      constraints: `- Start with prerequisites
- Use working code examples
- Include common pitfalls
- Provide troubleshooting section
- Test all examples before including`,
      outputFormat: `# Tutorial Title

## Prerequisites
- List of requirements

## Introduction
- What you'll learn
- Why it matters

## Step-by-Step Guide
### Step 1: Title
Explanation + code example

### Step 2: Title
...

## Common Pitfalls
- Issue → Solution

## Troubleshooting
- Problem → Fix

## Next Steps
- Advanced topics to explore`,
      styleTone: 'Educational, encouraging, clear',
      lengthLimits: '1000-2000 words, focused on clarity',
      evaluationBar: 'Reader can follow tutorial and achieve result',
      risksToAvoid: `- Skipping steps
- Untested examples
- Assuming too much knowledge
- Missing error handling`,
    },
  },
];

/**
 * Get template by ID
 */
export function getTemplate(id: string): TemplateDefinition | undefined {
  return GUIDE_TEMPLATES.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): TemplateDefinition[] {
  return GUIDE_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get all categories
 */
export function getCategories(): string[] {
  return Array.from(new Set(GUIDE_TEMPLATES.map(t => t.category)));
}

/**
 * Apply template to create new prompt
 */
export function applyTemplate(template: TemplateDefinition): PromptFormData {
  return {
    id: crypto.randomUUID(),
    name: `New ${template.name}`,
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),

    // Apply template content
    model: 'claude-sonnet-4.5',
    audience: template.content.audience || '',
    objective: template.content.objective || '',
    taskScope: template.content.taskScope || '',
    domain: template.content.domain || '',
    thinkingMode: template.content.thinkingMode || 'balanced',
    agenticMode: template.content.agenticMode || 'single',

    inputsSummary: template.content.inputsSummary || '',
    constraints: template.content.constraints || '',
    outputFormat: template.content.outputFormat || '',
    styleTone: template.content.styleTone || 'Professional',
    lengthLimits: template.content.lengthLimits || '',
    evaluationBar: template.content.evaluationBar || '',
    risksToAvoid: template.content.risksToAvoid || '',

    variables: [],
  };
}
