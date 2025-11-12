import type { WorkflowGraph, WorkflowNode, OrchestrationMode } from '@/types/workflow';
import { generateOrchestratorPrompt, generateSubAgentPrompt, type OrchestratorConfig } from './orchestratorGenerator';
import { interpolateVariables } from '@/lib/variables/parser';

/**
 * Serialize workflow graph to markdown prompts
 * Supports 3 modes based on 2025 orchestration patterns
 */

export interface SerializationOptions {
  mode: OrchestrationMode;
  objective: string;
  successCriteria: string;
  variables?: Record<string, string>;
  includeComments?: boolean;
}

/**
 * Main serialization function
 */
export function serializeWorkflowGraph(
  graph: WorkflowGraph,
  options: SerializationOptions
): string {
  switch (options.mode) {
    case 'sequential':
      return serializeSequential(graph, options);
    case 'orchestrator':
      return serializeOrchestrator(graph, options);
    case 'state-machine':
      return serializeStateMachine(graph, options);
    case 'parallel':
      return serializeParallel(graph, options);
    default:
      throw new Error(`Unsupported orchestration mode: ${options.mode}`);
  }
}

/**
 * Mode 1: Sequential Chaining
 * Agents execute in order, passing artifacts
 */
function serializeSequential(graph: WorkflowGraph, options: SerializationOptions): string {
  const { objective, successCriteria, variables = {}, includeComments = true } = options;

  const sortedNodes = topologicalSort(graph);

  let markdown = `# Sequential Multi-Agent Workflow

${includeComments ? '<!-- Agents execute in order, passing artifacts between steps -->\n\n' : ''}`;

  markdown += `## Workflow Objective
${objective}

## Success Criteria
${successCriteria}

---

`;

  sortedNodes.forEach((node, index) => {
    const { label, role, promptTemplate, inputs, outputs, successCriteria: nodeCriteria } = node.data;

    markdown += `## Agent ${index + 1}: ${label}\n\n`;

    if (includeComments) {
      markdown += `<!-- Role: ${role} -->\n`;
      markdown += `<!-- Inputs: ${inputs.length > 0 ? inputs.join(', ') : 'None'} -->\n`;
      markdown += `<!-- Outputs: ${outputs.join(', ')} -->\n\n`;
    }

    // Add dependencies info
    const deps = getNodeDependencies(graph, node.id);
    if (deps.length > 0) {
      markdown += `**Prerequisites:** Complete ${deps.map(d => {
        const depNode = graph.nodes.find(n => n.id === d);
        return depNode ? depNode.data.label : d;
      }).join(', ')}\n\n`;

      markdown += `**Available Artifacts:**\n`;
      deps.forEach(depId => {
        const depNode = graph.nodes.find(n => n.id === depId);
        if (depNode && depNode.data.outputs.length > 0) {
          markdown += `- From ${depNode.data.label}: ${depNode.data.outputs.join(', ')}\n`;
        }
      });
      markdown += '\n';
    }

    // Generate agent prompt
    const agentPrompt = generateSubAgentPrompt(node, variables);
    markdown += `<agent role="${role}" output="${outputs.join(',')}">\n\n`;
    markdown += agentPrompt;
    markdown += `\n\n</agent>\n\n`;

    if (nodeCriteria) {
      markdown += `**Validation:** ${nodeCriteria}\n\n`;
    }

    markdown += `**Outputs:** ${outputs.join(', ')}\n\n`;
    markdown += `---\n\n`;
  });

  markdown += `## Final Aggregation

Combine all artifacts:
${sortedNodes.map((n, i) => `${i + 1}. ${n.data.label}: ${n.data.outputs.join(', ')}`).join('\n')}

Produce final deliverable that satisfies: ${successCriteria}
`;

  return markdown;
}

/**
 * Mode 2: Orchestrator-Worker Pattern
 * Central coordinator delegates to specialized agents
 */
function serializeOrchestrator(graph: WorkflowGraph, options: SerializationOptions): string {
  const { objective, successCriteria, variables = {} } = options;

  const config: OrchestratorConfig = {
    objective,
    successCriteria,
    variables,
  };

  return generateOrchestratorPrompt(graph, config);
}

/**
 * Mode 3: State Machine (LangGraph-style)
 * Stateful workflow with explicit state transitions
 */
function serializeStateMachine(graph: WorkflowGraph, options: SerializationOptions): string {
  const { objective, successCriteria, variables = {}, includeComments = true } = options;

  const sortedNodes = topologicalSort(graph);

  let markdown = `# State Machine Multi-Agent Workflow

${includeComments ? '<!-- LangGraph-style stateful orchestration -->\n\n' : ''}`;

  markdown += `## Objective
${objective}

## Success Criteria
${successCriteria}

## Workflow State Schema

\`\`\`typescript
interface WorkflowState {
  objective: string;
  current_phase: 'planning' | 'execution' | 'review' | 'complete';
  current_agent: string;
  artifacts: {
    name: string;
    path: string;
    created_by: string;
    timestamp: number;
  }[];
  decisions: string[];
  next_action: string;
  variables: Record<string, any>;
}
\`\`\`

## State Initialization

\`\`\`json
{
  "objective": "${objective}",
  "current_phase": "planning",
  "current_agent": "START",
  "artifacts": [],
  "decisions": [],
  "next_action": "${sortedNodes[0]?.data.label || 'BEGIN'}",
  "variables": ${JSON.stringify(variables, null, 2)}
}
\`\`\`

---

## State Machine Definition

`;

  // Build state machine graph
  markdown += `### Nodes (Agents)\n\n`;

  sortedNodes.forEach((node, index) => {
    const { label, role, outputs } = node.data;

    markdown += `#### ${index + 1}. ${label} (${role})\n`;
    markdown += `**State Update:**\n`;
    markdown += `- Set \`current_agent\` = "${label}"\n`;
    markdown += `- Execute agent logic\n`;
    markdown += `- Create artifacts: ${outputs.join(', ')}\n`;
    markdown += `- Append to \`state.artifacts\`\n`;
    markdown += `- Record decision in \`state.decisions\`\n\n`;

    // Add transitions
    const outgoingEdges = graph.edges.filter(e => e.source === node.id);
    if (outgoingEdges.length > 0) {
      markdown += `**Transitions:**\n`;
      outgoingEdges.forEach(edge => {
        const targetNode = graph.nodes.find(n => n.id === edge.target);
        const condition = edge.data?.condition;

        if (condition) {
          markdown += `- IF \`${condition}\` → ${targetNode?.data.label || edge.target}\n`;
        } else {
          markdown += `- → ${targetNode?.data.label || edge.target}\n`;
        }
      });
      markdown += '\n';
    } else {
      markdown += `**Transitions:**\n- → END\n\n`;
    }
  });

  markdown += `### Execution Protocol\n\n`;

  markdown += `1. **Initialize State**
   - Load initial state
   - Set objective and variables
   - Begin at START node

2. **Execute Current Node**
   - Read \`state.current_agent\`
   - Execute corresponding agent
   - Wait for artifacts
   - Update state with results

3. **Evaluate Transitions**
   - Check conditions on outgoing edges
   - Select next agent based on state
   - Update \`state.next_action\`

4. **Repeat Until END**
   - Continue until \`state.current_phase\` = "complete"
   - Validate final state against success criteria

5. **Persist State**
   - Save state to: \`artifacts/workflow-state.json\`
   - Track all state transitions
   - Enable recovery and resume

---

## Agent Definitions

`;

  // Add agent prompts
  sortedNodes.forEach((node, index) => {
    markdown += `### Agent ${index + 1}: ${node.data.label}\n\n`;
    markdown += `\`\`\`markdown\n`;
    markdown += generateSubAgentPrompt(node, variables);
    markdown += `\n\`\`\`\n\n`;
  });

  markdown += `---

## State Machine Execution

**Current State:** Read from \`artifacts/workflow-state.json\`

**Next Action:** Execute agent \`{{ state.next_action }}\`

**On Completion:** Update state and persist

**Final State:** \`current_phase\` = "complete", all success criteria met
`;

  return markdown;
}

/**
 * Mode 4: Parallel Execution (Fork-Join)
 */
function serializeParallel(graph: WorkflowGraph, options: SerializationOptions): string {
  const { objective, successCriteria, variables = {}, includeComments = true } = options;

  // Identify parallel branches
  const parallelGroups = identifyParallelGroups(graph);

  let markdown = `# Parallel Multi-Agent Workflow

${includeComments ? '<!-- Fork-join pattern with parallel execution -->\n\n' : ''}`;

  markdown += `## Objective
${objective}

## Success Criteria
${successCriteria}

---

## Parallel Execution Plan

`;

  parallelGroups.forEach((group, index) => {
    if (group.length === 1) {
      const node = group[0];
      markdown += `### Sequential Step ${index + 1}: ${node.data.label}\n`;
      markdown += `Execute ${node.data.role} agent\n`;
      markdown += `Output: ${node.data.outputs.join(', ')}\n\n`;
    } else {
      markdown += `### Parallel Fork ${index + 1}\n\n`;
      markdown += `Execute ${group.length} agents in parallel:\n\n`;

      group.forEach((node, i) => {
        markdown += `**Branch ${i + 1}: ${node.data.label}**\n`;
        markdown += `- Role: ${node.data.role}\n`;
        markdown += `- Outputs: ${node.data.outputs.join(', ')}\n`;
        markdown += `- Independent execution\n\n`;
      });

      markdown += `**Join Point:** Wait for all branches to complete\n\n`;
      markdown += `**Artifacts Available:**\n`;
      group.forEach(node => {
        markdown += `- ${node.data.outputs.join(', ')}\n`;
      });
      markdown += '\n';
    }
  });

  markdown += `## Implementation\n\n`;

  markdown += `Use Task tool to launch agents in parallel:

\`\`\`typescript
// Launch parallel agents
const tasks = [
${parallelGroups.flat().map(n => `  Task({ subagent_type: "general-purpose", description: "${n.data.label}" })`).join(',\n')}
];

// Wait for all to complete
await Promise.all(tasks);

// Aggregate results
aggregateArtifacts();
\`\`\`

## Final Aggregation

Combine artifacts from all branches and produce final deliverable.
`;

  return markdown;
}

/**
 * Topological sort utility
 */
function topologicalSort(graph: WorkflowGraph): WorkflowNode[] {
  const sorted: WorkflowNode[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;
    if (visiting.has(nodeId)) {
      throw new Error('Circular dependency detected in workflow graph');
    }

    visiting.add(nodeId);

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
 * Get node dependencies
 */
function getNodeDependencies(graph: WorkflowGraph, nodeId: string): string[] {
  return graph.edges
    .filter(edge => edge.target === nodeId)
    .map(edge => edge.source);
}

/**
 * Identify parallel execution groups
 */
function identifyParallelGroups(graph: WorkflowGraph): WorkflowNode[][] {
  const groups: WorkflowNode[][] = [];
  const processed = new Set<string>();

  const sortedNodes = topologicalSort(graph);

  sortedNodes.forEach(node => {
    if (processed.has(node.id)) return;

    // Check if this node can run in parallel with others
    const parallelNodes = findParallelNodes(graph, node, sortedNodes, processed);

    if (parallelNodes.length > 1) {
      groups.push(parallelNodes);
      parallelNodes.forEach(n => processed.add(n.id));
    } else {
      groups.push([node]);
      processed.add(node.id);
    }
  });

  return groups;
}

/**
 * Find nodes that can execute in parallel with given node
 */
function findParallelNodes(
  graph: WorkflowGraph,
  node: WorkflowNode,
  allNodes: WorkflowNode[],
  processed: Set<string>
): WorkflowNode[] {
  const parallel = [node];
  const nodeDeps = getNodeDependencies(graph, node.id);

  for (const other of allNodes) {
    if (other.id === node.id || processed.has(other.id)) continue;

    const otherDeps = getNodeDependencies(graph, other.id);

    // Can run in parallel if they don't depend on each other
    // and have the same dependencies
    if (!nodeDeps.includes(other.id) && !otherDeps.includes(node.id)) {
      if (arraysEqual(nodeDeps.sort(), otherDeps.sort())) {
        parallel.push(other);
      }
    }
  }

  return parallel;
}

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((val, idx) => val === b[idx]);
}
