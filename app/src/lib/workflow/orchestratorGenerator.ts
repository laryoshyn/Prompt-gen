import type { WorkflowGraph, WorkflowNode, AgentNodeData, Artifact } from '@/types/workflow';
import { getAgentTemplate } from './agentTemplates';
import { interpolateVariables } from '@/lib/variables/parser';

/**
 * Generate orchestrator prompt from workflow graph
 * Based on 2025 multi-agent orchestration patterns
 */

export interface OrchestratorConfig {
  objective: string;
  successCriteria: string;
  variables?: Record<string, string>;
  maxIterations?: number;
  humanInLoop?: boolean;
}

/**
 * Generate orchestrator prompt that coordinates sub-agents
 */
export function generateOrchestratorPrompt(
  graph: WorkflowGraph,
  config: OrchestratorConfig
): string {
  const { objective, successCriteria, variables = {}, maxIterations = 10, humanInLoop = false } = config;

  // Sort nodes topologically
  const sortedNodes = topologicalSort(graph);

  // Build sub-agent descriptions
  const subAgentDescriptions = sortedNodes
    .map((node) => buildSubAgentDescription(node, variables))
    .join('\n');

  // Build workflow steps
  const workflowSteps = buildWorkflowSteps(graph, sortedNodes, variables);

  // Build artifact tracking
  const artifactSystem = buildArtifactSystem(sortedNodes);

  const orchestratorPrompt = `# Multi-Agent Workflow Orchestrator

You are coordinating a multi-agent workflow using Claude Code sub-agents.

## Objective
${objective}

## Success Criteria
${successCriteria}

## Available Sub-Agents

${subAgentDescriptions}

## Workflow Protocol

### 1. Planning Phase
Before starting execution:
- Review the workflow steps below
- Identify dependencies between agents
- Prepare initial context and variables
- Set up artifact storage structure

### 2. Execution Phase

${workflowSteps}

### 3. Artifact Management

${artifactSystem}

**Artifact Passing Protocol:**
- Sub-agents create artifacts (files, data structures)
- Reference artifacts as: \`artifact://[agent-name]/[filename]\`
- Validate each artifact before proceeding to dependent agents
- Track all artifacts in: \`artifacts/workflow-state.json\`

### 4. Validation & Iteration

After each agent completes:
1. **Validate Output**
   - Check artifact was created
   - Verify it meets success criteria
   - Review for quality and completeness

2. **Handle Failures**
   - If validation fails: retry with feedback (max ${maxIterations} attempts)
   - If critical failure: abort and report
   - Log all failures for analysis

3. **Update State**
   - Record completion in workflow state
   - Update artifact registry
   - Proceed to dependent agents

${humanInLoop ? `
### 5. Human-in-the-Loop

Pause for human review after these critical steps:
${sortedNodes
  .filter((n) => n.data.config.parallel === false && ['architect', 'critic'].includes(n.data.role))
  .map((n) => `- After ${n.data.label} completes`)
  .join('\n')}

Wait for approval before proceeding.
` : ''}

## Invocation Instructions

For each sub-agent, use the Task tool:

\`\`\`typescript
// Example invocation
Task({
  subagent_type: "general-purpose",
  description: "Run architect agent",
  prompt: "Read .claude/agents/architect.md and execute with context: ..."
})
\`\`\`

## Completion

When all agents finish:
1. Aggregate all artifacts
2. Generate final report
3. Validate against success criteria: ${successCriteria}
4. Output final deliverable

## Workflow State

Track progress in \`artifacts/workflow-state.json\`:

\`\`\`json
{
  "objective": "${objective}",
  "current_phase": "planning|execution|review|complete",
  "completed_agents": [],
  "artifacts": [],
  "failures": [],
  "next_action": ""
}
\`\`\`

---

**Begin orchestration when ready. Start with the planning phase.**
`;

  return orchestratorPrompt;
}

/**
 * Build sub-agent description for orchestrator
 */
function buildSubAgentDescription(node: WorkflowNode, variables: Record<string, string>): string {
  const { label, role, description, promptTemplate, inputs, outputs } = node.data;

  const template = getAgentTemplate(role);

  return `### ${label} (${role})
**Description:** ${description || template.description}
**Inputs:** ${inputs.length > 0 ? inputs.join(', ') : 'None'}
**Outputs:** ${outputs.length > 0 ? outputs.join(', ') : 'Defined in agent'}
**Agent File:** \`.claude/agents/${label.toLowerCase().replace(/\s+/g, '-')}.md\`

**Invocation:**
\`\`\`
Task tool → Execute ${label}
- Read agent prompt from file
- Pass required inputs: ${inputs.join(', ') || 'objective, context'}
- Wait for artifact creation
- Validate output meets criteria
\`\`\`
`;
}

/**
 * Build workflow execution steps
 */
function buildWorkflowSteps(
  graph: WorkflowGraph,
  sortedNodes: WorkflowNode[],
  variables: Record<string, string>
): string {
  let steps = '';

  sortedNodes.forEach((node, index) => {
    const { label, inputs, outputs, successCriteria } = node.data;
    const dependencies = getNodeDependencies(graph, node.id);

    steps += `#### Step ${index + 1}: ${label}\n\n`;

    if (dependencies.length > 0) {
      steps += `**Prerequisites:**\n`;
      dependencies.forEach(dep => {
        const depNode = graph.nodes.find(n => n.id === dep);
        if (depNode) {
          steps += `- Wait for ${depNode.data.label} to complete\n`;
          steps += `- Obtain artifacts: ${depNode.data.outputs.join(', ')}\n`;
        }
      });
      steps += '\n';
    }

    steps += `**Execute:**\n`;
    steps += `1. Invoke ${label} sub-agent\n`;
    if (inputs.length > 0) {
      steps += `2. Pass inputs: ${inputs.join(', ')}\n`;
    }
    steps += `3. Monitor for artifact creation: ${outputs.join(', ')}\n`;
    if (successCriteria) {
      steps += `4. Validate: ${successCriteria}\n`;
    }
    steps += `5. Update workflow state\n\n`;
  });

  return steps;
}

/**
 * Build artifact system documentation
 */
function buildArtifactSystem(nodes: WorkflowNode[]): string {
  const allOutputs = nodes.flatMap(n => n.data.outputs);

  let system = `**Artifact Structure:**\n\n\`\`\`\nartifacts/\n`;

  nodes.forEach(node => {
    const dirName = node.data.label.toLowerCase().replace(/\s+/g, '-');
    system += `├── ${dirName}/\n`;
    node.data.outputs.forEach(output => {
      system += `│   └── ${output}\n`;
    });
  });

  system += `└── workflow-state.json\n\`\`\`\n\n`;

  system += `**Artifact Registry:**\n\n`;
  nodes.forEach(node => {
    if (node.data.outputs.length > 0) {
      system += `- **${node.data.label}** produces: ${node.data.outputs.join(', ')}\n`;
    }
  });

  return system;
}

/**
 * Topological sort of workflow nodes
 */
function topologicalSort(graph: WorkflowGraph): WorkflowNode[] {
  const sorted: WorkflowNode[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;
    if (visiting.has(nodeId)) {
      throw new Error('Circular dependency detected');
    }

    visiting.add(nodeId);

    // Visit dependencies first
    const dependencies = getNodeDependencies(graph, nodeId);
    dependencies.forEach(depId => visit(depId));

    visiting.delete(nodeId);
    visited.add(nodeId);

    const node = graph.nodes.find(n => n.id === nodeId);
    if (node) sorted.push(node);
  }

  graph.nodes.forEach(node => visit(node.id));

  return sorted;
}

/**
 * Get node dependencies (nodes that must complete before this one)
 */
function getNodeDependencies(graph: WorkflowGraph, nodeId: string): string[] {
  return graph.edges
    .filter(edge => edge.target === nodeId)
    .map(edge => edge.source);
}

/**
 * Generate individual sub-agent prompt file
 */
export function generateSubAgentPrompt(
  node: WorkflowNode,
  variables: Record<string, string> = {}
): string {
  const { role, promptTemplate, description } = node.data;
  const template = getAgentTemplate(role);

  // Use custom template if provided, otherwise use role template
  const baseTemplate = promptTemplate || template.promptTemplate;

  // Interpolate variables
  const interpolated = interpolateVariables(baseTemplate, variables);

  return interpolated;
}

/**
 * Generate complete multi-agent prompt package
 */
export interface MultiAgentPackage {
  orchestrator: string;
  agents: Record<string, string>;
  structure: {
    'orchestrator.md': string;
    agents: Record<string, string>;
  };
}

export function generateMultiAgentPackage(
  graph: WorkflowGraph,
  config: OrchestratorConfig
): MultiAgentPackage {
  const orchestrator = generateOrchestratorPrompt(graph, config);

  const agents: Record<string, string> = {};
  graph.nodes.forEach(node => {
    const agentName = node.data.label.toLowerCase().replace(/\s+/g, '-');
    agents[agentName] = generateSubAgentPrompt(node, config.variables);
  });

  return {
    orchestrator,
    agents,
    structure: {
      'orchestrator.md': orchestrator,
      agents,
    },
  };
}
