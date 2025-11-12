/**
 * Spec-Driven Workflow Export
 * Export workflows in multiple industry-standard formats for portability
 *
 * Supported formats:
 * - OpenSpec (Fission-AI): Deterministic, reviewable workflows
 * - Oracle Agent Spec: Framework-agnostic agent definitions
 * - Standard Workflow JSON: Generic workflow representation
 * - Claude Code: .claude/agents/ format
 * - LangGraph: StateGraph format
 * - CrewAI: Crew/Flow format
 */

import type { WorkflowGraph, AgentNodeData, WorkflowEdgeData } from '@/types/workflow';
import type { Node, Edge } from 'reactflow';

/**
 * Export format types
 */
export type ExportFormat =
  | 'openspec' // Fission-AI OpenSpec
  | 'oracle-spec' // Oracle Agent Spec
  | 'standard-json' // Generic JSON workflow
  | 'claude-code' // Claude Code .claude/agents/
  | 'langgraph' // LangGraph StateGraph
  | 'crewai'; // CrewAI Crew/Flow

/**
 * OpenSpec format (Fission-AI)
 */
export interface OpenSpec {
  version: '1.0';
  metadata: {
    name: string;
    description: string;
    author?: string;
    created: string; // ISO timestamp
    tags?: string[];
  };
  intents: Array<{
    id: string;
    name: string;
    description: string;
    triggers?: string[];
  }>;
  agents: Array<{
    id: string;
    name: string;
    role: string;
    capabilities: string[];
    context: string;
    constraints?: string[];
  }>;
  workflow: {
    type: 'sequential' | 'parallel' | 'conditional' | 'state-machine';
    steps: Array<{
      id: string;
      agent: string;
      action: string;
      inputs?: Record<string, string>;
      outputs?: Record<string, string>;
      conditions?: Array<{
        type: 'if' | 'unless' | 'while';
        expression: string;
        then?: string; // Step ID
        else?: string; // Step ID
      }>;
    }>;
  };
  artifacts: Array<{
    id: string;
    name: string;
    type: string;
    schema?: object;
    produced_by: string;
    consumed_by: string[];
  }>;
}

/**
 * Oracle Agent Spec format
 */
export interface OracleAgentSpec {
  spec_version: '1.0';
  agent: {
    id: string;
    name: string;
    description: string;
    version: string;
  };
  capabilities: Array<{
    name: string;
    description: string;
    input_schema: object;
    output_schema: object;
  }>;
  requirements: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    tools?: string[];
  };
  prompt_template: string;
  examples?: Array<{
    input: unknown;
    output: unknown;
  }>;
  metadata?: Record<string, unknown>;
}

/**
 * Standard Workflow JSON format
 */
export interface StandardWorkflowJSON {
  format: 'standard-workflow';
  version: '1.0';
  workflow: {
    id: string;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
  };
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    position: { x: number; y: number };
    config: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    condition?: unknown;
  }>;
  variables?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Claude Code format (.claude/agents/)
 */
export interface ClaudeCodeExport {
  format: 'claude-code';
  agents: Record<string, {
    name: string;
    role: string;
    prompt: string;
    config?: Record<string, unknown>;
  }>;
  orchestrator?: {
    name: string;
    prompt: string;
    agents: string[];
  };
  readme: string;
}

/**
 * LangGraph format
 */
export interface LangGraphExport {
  format: 'langgraph';
  version: '0.2.0';
  graph: {
    nodes: Record<string, {
      type: 'agent' | 'tool' | 'conditional';
      runnable: string; // Python code or reference
    }>;
    edges: Array<{
      source: string;
      target: string;
      condition?: string;
    }>;
    state_schema: object;
    checkpointer?: string;
  };
  code: string; // Generated Python code
}

/**
 * CrewAI format
 */
export interface CrewAIExport {
  format: 'crewai';
  version: '0.11.0';
  crew: {
    name: string;
    agents: Array<{
      role: string;
      goal: string;
      backstory: string;
      tools?: string[];
    }>;
    tasks: Array<{
      description: string;
      agent: string;
      expected_output: string;
      context?: string[];
    }>;
    process: 'sequential' | 'hierarchical';
  };
  code: string; // Generated Python code
}

/**
 * Spec Export Manager
 */
export class SpecExportManager {
  /**
   * Export workflow to specified format
   */
  export(workflow: WorkflowGraph, format: ExportFormat): string {
    switch (format) {
      case 'openspec':
        return JSON.stringify(this.exportOpenSpec(workflow), null, 2);
      case 'oracle-spec':
        return this.exportOracleSpecs(workflow);
      case 'standard-json':
        return JSON.stringify(this.exportStandardJSON(workflow), null, 2);
      case 'claude-code':
        return JSON.stringify(this.exportClaudeCode(workflow), null, 2);
      case 'langgraph':
        return this.exportLangGraph(workflow);
      case 'crewai':
        return this.exportCrewAI(workflow);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export to OpenSpec format
   */
  private exportOpenSpec(workflow: WorkflowGraph): OpenSpec {
    const intents = [
      {
        id: 'main-intent',
        name: workflow.name,
        description: workflow.description || 'Multi-agent workflow execution',
      },
    ];

    const agents = workflow.nodes.map(node => ({
      id: node.id,
      name: node.data.label,
      role: node.data.role,
      capabilities: [node.data.description || 'Agent capability'],
      context: node.data.promptTemplate || '',
      constraints: node.data.config.thinkingMode ? [`thinking_mode: ${node.data.config.thinkingMode}`] : undefined,
    }));

    const steps = workflow.nodes.map((node, index) => {
      const outgoingEdges = workflow.edges.filter(e => e.source === node.id);

      return {
        id: node.id,
        agent: node.id,
        action: 'execute',
        inputs: node.data.inputs?.reduce((acc, inp) => ({ ...acc, [inp]: 'input' }), {}) || {},
        outputs: node.data.outputs?.reduce((acc, out) => ({ ...acc, [out]: 'output' }), {}) || {},
        conditions: outgoingEdges.length > 0 ? outgoingEdges.map(edge => ({
          type: 'if' as const,
          expression: edge.data?.condition?.description || 'true',
          then: edge.target,
        })) : undefined,
      };
    });

    return {
      version: '1.0',
      metadata: {
        name: workflow.name,
        description: workflow.description || '',
        created: new Date(workflow.createdAt).toISOString(),
        tags: ['prompt-gen', workflow.mode],
      },
      intents,
      agents,
      workflow: {
        type: workflow.mode === 'sequential' ? 'sequential' :
              workflow.mode === 'parallel' ? 'parallel' :
              workflow.mode === 'state-machine' ? 'state-machine' : 'conditional',
        steps,
      },
      artifacts: [],
    };
  }

  /**
   * Export to Oracle Agent Spec (one per agent)
   */
  private exportOracleSpecs(workflow: WorkflowGraph): string {
    const specs = workflow.nodes.map(node => {
      const spec: OracleAgentSpec = {
        spec_version: '1.0',
        agent: {
          id: node.id,
          name: node.data.label,
          description: node.data.description || '',
          version: '1.0.0',
        },
        capabilities: [
          {
            name: `${node.data.role}_capability`,
            description: node.data.description || `${node.data.role} capability`,
            input_schema: {
              type: 'object',
              properties: node.data.inputs?.reduce((acc, inp) => ({
                ...acc,
                [inp]: { type: 'string', description: `Input: ${inp}` },
              }), {}) || {},
            },
            output_schema: {
              type: 'object',
              properties: node.data.outputs?.reduce((acc, out) => ({
                ...acc,
                [out]: { type: 'string', description: `Output: ${out}` },
              }), {}) || {},
            },
          },
        ],
        requirements: {
          model: 'claude-sonnet-4-5',
          temperature: 0.7,
          tools: [],
        },
        prompt_template: node.data.promptTemplate || '',
        metadata: {
          role: node.data.role,
          thinkingMode: node.data.config.thinkingMode,
          parallel: node.data.config.parallel,
        },
      };

      return spec;
    });

    // Return as multi-document YAML-style JSON
    return specs.map(spec => JSON.stringify(spec, null, 2)).join('\n\n---\n\n');
  }

  /**
   * Export to Standard Workflow JSON
   */
  private exportStandardJSON(workflow: WorkflowGraph): StandardWorkflowJSON {
    return {
      format: 'standard-workflow',
      version: '1.0',
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        created_at: new Date(workflow.createdAt).toISOString(),
        updated_at: new Date(workflow.updatedAt).toISOString(),
      },
      nodes: workflow.nodes.map(node => ({
        id: node.id,
        type: node.data.role,
        label: node.data.label,
        position: node.position,
        config: {
          promptTemplate: node.data.promptTemplate,
          description: node.data.description,
          ...node.data.config,
        },
      })),
      edges: workflow.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        condition: edge.data?.condition,
      })),
      metadata: {
        mode: workflow.mode,
      },
    };
  }

  /**
   * Export to Claude Code format
   */
  private exportClaudeCode(workflow: WorkflowGraph): ClaudeCodeExport {
    const agents: ClaudeCodeExport['agents'] = {};

    workflow.nodes.forEach(node => {
      agents[node.id] = {
        name: node.data.label,
        role: node.data.role,
        prompt: node.data.promptTemplate || '',
        config: node.data.config,
      };
    });

    // Create orchestrator if mode is orchestrator
    const orchestrator = workflow.mode === 'orchestrator' ? {
      name: `${workflow.name} Orchestrator`,
      prompt: this.generateOrchestratorPrompt(workflow),
      agents: workflow.nodes.map(n => n.id),
    } : undefined;

    const readme = this.generateReadme(workflow);

    return {
      format: 'claude-code',
      agents,
      orchestrator,
      readme,
    };
  }

  /**
   * Export to LangGraph format
   */
  private exportLangGraph(workflow: WorkflowGraph): string {
    const graphDef: LangGraphExport = {
      format: 'langgraph',
      version: '0.2.0',
      graph: {
        nodes: {},
        edges: workflow.edges.map(edge => ({
          source: edge.source,
          target: edge.target,
          condition: edge.data?.condition?.expression,
        })),
        state_schema: {
          type: 'object',
          properties: {
            messages: { type: 'array' },
            artifacts: { type: 'object' },
          },
        },
        checkpointer: 'MemorySaver',
      },
      code: this.generateLangGraphCode(workflow),
    };

    workflow.nodes.forEach(node => {
      graphDef.graph.nodes[node.id] = {
        type: 'agent',
        runnable: `${node.data.role}_agent`,
      };
    });

    return JSON.stringify(graphDef, null, 2);
  }

  /**
   * Export to CrewAI format
   */
  private exportCrewAI(workflow: WorkflowGraph): string {
    const crewExport: CrewAIExport = {
      format: 'crewai',
      version: '0.11.0',
      crew: {
        name: workflow.name,
        agents: workflow.nodes.map(node => ({
          role: node.data.role,
          goal: node.data.description || `Execute ${node.data.role} tasks`,
          backstory: `I am a ${node.data.role} agent specialized in ${node.data.description || 'task execution'}.`,
          tools: [],
        })),
        tasks: workflow.nodes.map((node, index) => ({
          description: node.data.description || `Execute ${node.data.role} task`,
          agent: node.data.role,
          expected_output: node.data.outputs?.join(', ') || 'Task completion',
          context: index > 0 ? [workflow.nodes[index - 1].data.role] : undefined,
        })),
        process: workflow.mode === 'sequential' ? 'sequential' : 'hierarchical',
      },
      code: this.generateCrewAICode(workflow),
    };

    return JSON.stringify(crewExport, null, 2);
  }

  /**
   * Generate orchestrator prompt for Claude Code
   */
  private generateOrchestratorPrompt(workflow: WorkflowGraph): string {
    const agentList = workflow.nodes.map(n => `- ${n.data.label} (${n.data.role})`).join('\n');

    return `You are the orchestrator for the "${workflow.name}" workflow.

Your role is to coordinate the following agents:
${agentList}

Workflow mode: ${workflow.mode}

Execute the workflow by:
1. Analyzing the task requirements
2. Delegating to appropriate agents in the correct order
3. Collecting and synthesizing results
4. Ensuring quality and completeness

Use the Task tool to delegate to sub-agents as needed.`;
  }

  /**
   * Generate README for Claude Code export
   */
  private generateReadme(workflow: WorkflowGraph): string {
    return `# ${workflow.name}

${workflow.description || 'Multi-agent workflow'}

## Agents

${workflow.nodes.map(n => `- **${n.data.label}** (${n.data.role}): ${n.data.description || ''}`).join('\n')}

## Workflow Mode

${workflow.mode}

## Usage

This workflow was exported from Prompt-Gen and can be used with Claude Code.

Place the agent files in \`.claude/agents/\` directory.

Generated: ${new Date().toISOString()}
`;
  }

  /**
   * Generate LangGraph Python code
   */
  private generateLangGraphCode(workflow: WorkflowGraph): string {
    const imports = `from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from typing import TypedDict, Annotated
import operator

class WorkflowState(TypedDict):
    messages: Annotated[list, operator.add]
    artifacts: dict
`;

    const agents = workflow.nodes.map(node => `
def ${node.id}_agent(state: WorkflowState):
    """${node.data.description || node.data.role}"""
    # Agent implementation here
    return state
`).join('\n');

    const graphSetup = `
# Create the graph
workflow = StateGraph(WorkflowState)

# Add nodes
${workflow.nodes.map(n => `workflow.add_node("${n.id}", ${n.id}_agent)`).join('\n')}

# Add edges
${workflow.edges.map(e => {
  if (e.data?.condition) {
    return `workflow.add_conditional_edges("${e.source}", lambda s: "${e.target}" if ${e.data.condition.expression || 'True'} else END)`;
  }
  return `workflow.add_edge("${e.source}", "${e.target}")`;
}).join('\n')}

# Set entry point
workflow.set_entry_point("${workflow.nodes[0]?.id || 'start'}")

# Compile with checkpointer
memory = MemorySaver()
app = workflow.compile(checkpointer=memory)
`;

    return imports + agents + graphSetup;
  }

  /**
   * Generate CrewAI Python code
   */
  private generateCrewAICode(workflow: WorkflowGraph): string {
    const imports = `from crewai import Agent, Task, Crew, Process

`;

    const agents = workflow.nodes.map(node => `
${node.id} = Agent(
    role="${node.data.role}",
    goal="${node.data.description || `Execute ${node.data.role} tasks`}",
    backstory="I am a ${node.data.role} agent.",
    verbose=True
)
`).join('\n');

    const tasks = workflow.nodes.map((node, index) => `
task_${index + 1} = Task(
    description="${node.data.description || `Execute ${node.data.role} task`}",
    agent=${node.id},
    expected_output="${node.data.outputs?.join(', ') || 'Task completion'}"
)
`).join('\n');

    const crew = `
# Create crew
crew = Crew(
    agents=[${workflow.nodes.map(n => n.id).join(', ')}],
    tasks=[${workflow.nodes.map((_, i) => `task_${i + 1}`).join(', ')}],
    process=Process.${ workflow.mode === 'sequential' ? 'sequential' : 'hierarchical'}
)

# Execute
result = crew.kickoff()
`;

    return imports + agents + tasks + crew;
  }

  /**
   * Get available export formats
   */
  getAvailableFormats(): Array<{
    id: ExportFormat;
    name: string;
    description: string;
    extension: string;
  }> {
    return [
      {
        id: 'openspec',
        name: 'OpenSpec (Fission-AI)',
        description: 'Deterministic, reviewable AI workflows',
        extension: 'json',
      },
      {
        id: 'oracle-spec',
        name: 'Oracle Agent Spec',
        description: 'Framework-agnostic agent definitions',
        extension: 'json',
      },
      {
        id: 'standard-json',
        name: 'Standard Workflow JSON',
        description: 'Generic workflow representation',
        extension: 'json',
      },
      {
        id: 'claude-code',
        name: 'Claude Code',
        description: '.claude/agents/ format',
        extension: 'json',
      },
      {
        id: 'langgraph',
        name: 'LangGraph',
        description: 'StateGraph format with Python code',
        extension: 'json',
      },
      {
        id: 'crewai',
        name: 'CrewAI',
        description: 'Crew/Flow format with Python code',
        extension: 'json',
      },
    ];
  }
}

/**
 * Singleton instance
 */
export const specExporter = new SpecExportManager();
