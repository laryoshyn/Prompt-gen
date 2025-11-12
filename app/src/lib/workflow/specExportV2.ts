import type { WorkflowGraph, WorkflowNode, WorkflowEdge, AgentNodeData } from '@/types/workflow';
import yaml from 'js-yaml';
import { serializeWorkflowGraph } from './graphSerializer';

/**
 * Export result supporting multiple output formats
 * V2 architecture - format-specific exports (YAML, Markdown, ZIP)
 */
export type ExportFormat =
  | 'execution-sequential'
  | 'execution-orchestrator'
  | 'execution-state-machine'
  | 'execution-parallel'
  | 'openspec'
  | 'crewai'
  | 'langgraph'
  | 'autogen'
  | 'temporal'
  | 'n8n'
  | 'claude-code'
  | 'standard-yaml'
  | 'standard-json';

export type ExportResult = {
  format: 'json' | 'yaml' | 'markdown' | 'zip';
  content: string | Blob;
  filename: string;
  files?: Record<string, string>; // For multi-file exports (before ZIP)
  mimeType?: string;
};

/**
 * Spec Export Engine V2
 * Industry-standard export formats (2025)
 */
export class SpecExportEngineV2 {
  /**
   * Main export method - routes to format-specific exporters
   */
  export(workflow: WorkflowGraph, format: ExportFormat): ExportResult {
    switch (format) {
      case 'execution-sequential':
        return this.exportExecutionPrompt(workflow, 'sequential');
      case 'execution-orchestrator':
        return this.exportExecutionPrompt(workflow, 'orchestrator');
      case 'execution-state-machine':
        return this.exportExecutionPrompt(workflow, 'state-machine');
      case 'execution-parallel':
        return this.exportExecutionPrompt(workflow, 'parallel');
      case 'openspec':
        return this.exportOpenSpec(workflow);
      case 'crewai':
        return this.exportCrewAI(workflow);
      case 'langgraph':
        return this.exportLangGraph(workflow);
      case 'autogen':
        return this.exportAutoGen(workflow);
      case 'temporal':
        return this.exportTemporal(workflow);
      case 'n8n':
        return this.exportN8N(workflow);
      case 'claude-code':
        return this.exportClaudeCode(workflow);
      case 'standard-yaml':
        return this.exportStandardYAML(workflow);
      case 'standard-json':
        return this.exportStandardJSON(workflow);
      default:
        throw new Error(`Unknown export format: ${format}`);
    }
  }

  // ==================== MARKDOWN EXPORTS ====================

  /**
   * Execution Prompt Export (Markdown)
   * Generates execution prompts for Claude based on orchestration mode
   */
  private exportExecutionPrompt(workflow: WorkflowGraph, mode: 'sequential' | 'orchestrator' | 'state-machine' | 'parallel'): ExportResult {
    const content = serializeWorkflowGraph(workflow, { mode });

    const modeNames = {
      sequential: 'Sequential',
      orchestrator: 'Orchestrator',
      'state-machine': 'StateMachine',
      parallel: 'Parallel',
    };

    return {
      format: 'markdown',
      content,
      filename: `${this.sanitizeFilename(workflow.name)}-${mode}-prompt.md`,
      mimeType: 'text/markdown',
    };
  }

  /**
   * OpenSpec Export (Markdown)
   * Research: Human-readable workflow specifications
   */
  private exportOpenSpec(workflow: WorkflowGraph): ExportResult {
    const lines: string[] = [];

    lines.push(`# ${workflow.name}\n`);
    if (workflow.description) {
      lines.push(`${workflow.description}\n`);
    }

    lines.push(`## Metadata\n`);
    lines.push(`- **Orchestration Mode**: ${workflow.mode}`);
    lines.push(`- **Created**: ${new Date(workflow.createdAt).toISOString()}`);
    lines.push(`- **Updated**: ${new Date(workflow.updatedAt).toISOString()}`);
    lines.push(`- **Agents**: ${workflow.nodes.length}`);
    lines.push(`- **Connections**: ${workflow.edges.length}\n`);

    lines.push(`## Agents\n`);
    workflow.nodes.forEach((node) => {
      const data = node.data as AgentNodeData;
      lines.push(`### ${data.label} (\`${node.id}\`)\n`);
      lines.push(`**Role**: ${data.role}\n`);
      if (data.description) {
        lines.push(`**Description**: ${data.description}\n`);
      }
      if (data.domain) {
        lines.push(`**Domain**: ${data.domain}\n`);
      }
      lines.push(`**Configuration**:`);
      lines.push(`- Thinking Mode: ${data.config.thinkingMode}`);
      lines.push(`- Parallel: ${data.config.parallel}`);
      if (data.config.timeout) {
        lines.push(`- Timeout: ${data.config.timeout}ms`);
      }
      if (data.config.retries) {
        lines.push(`- Retries: ${data.config.retries}`);
      }
      lines.push(``);

      if (data.inputs.length > 0) {
        lines.push(`**Inputs**: ${data.inputs.join(', ')}\n`);
      }
      if (data.outputs.length > 0) {
        lines.push(`**Outputs**: ${data.outputs.join(', ')}\n`);
      }

      lines.push(`**Prompt Template**:`);
      lines.push(`\`\`\`markdown`);
      lines.push(data.promptTemplate);
      lines.push(`\`\`\`\n`);
    });

    lines.push(`## Workflow Connections\n`);
    workflow.edges.forEach((edge) => {
      const source = workflow.nodes.find((n) => n.id === edge.source);
      const target = workflow.nodes.find((n) => n.id === edge.target);

      lines.push(`### ${source?.data.label} → ${target?.data.label}\n`);
      if (edge.data?.label) {
        lines.push(`**Label**: ${edge.data.label}\n`);
      }
      if (edge.data?.condition) {
        lines.push(`**Condition**: \`${edge.data.condition}\`\n`);
      }
      if (edge.data?.priority !== undefined) {
        lines.push(`**Priority**: ${edge.data.priority}\n`);
      }

      // Add edge configuration summary
      if (edge.data?.retryPolicy?.maxAttempts) {
        lines.push(`**Retry Policy**: ${edge.data.retryPolicy.maxAttempts} attempts, ${edge.data.retryPolicy.backoffType} backoff\n`);
      }
      if (edge.data?.timeout) {
        lines.push(`**Timeout**: ${edge.data.timeout.executionTimeoutMs}ms execution\n`);
      }

      lines.push(``);
    });

    const content = lines.join('\n');
    return {
      format: 'markdown',
      content,
      filename: `${this.sanitizeFilename(workflow.name)}-openspec.md`,
      mimeType: 'text/markdown',
    };
  }

  /**
   * Claude Code Export (Markdown)
   * Format: .claude/agents/*.md files (one per agent)
   */
  private exportClaudeCode(workflow: WorkflowGraph): ExportResult {
    const files: Record<string, string> = {};

    // Create README.md
    const readme: string[] = [];
    readme.push(`# ${workflow.name}\n`);
    if (workflow.description) {
      readme.push(`${workflow.description}\n`);
    }
    readme.push(`## Orchestration Mode: ${workflow.mode}\n`);
    readme.push(`## Agents\n`);
    workflow.nodes.forEach((node) => {
      readme.push(`- **${node.data.label}** (\`${node.id}\`) - ${node.data.role}`);
    });
    readme.push(`\n## Usage\n`);
    readme.push(`1. Place these files in \`.claude/agents/\` directory`);
    readme.push(`2. Use Claude Code to invoke agents via Task tool`);
    readme.push(`3. Agents will execute according to the workflow orchestration\n`);

    files['README.md'] = readme.join('\n');

    // Create individual agent files
    workflow.nodes.forEach((node) => {
      const data = node.data as AgentNodeData;
      const agentFile: string[] = [];

      agentFile.push(`# ${data.label}\n`);
      agentFile.push(`**Role**: ${data.role}\n`);
      if (data.description) {
        agentFile.push(`**Description**: ${data.description}\n`);
      }
      if (data.domain) {
        agentFile.push(`**Specialization**: ${data.domain}\n`);
      }

      agentFile.push(`## Configuration\n`);
      agentFile.push(`- **Thinking Mode**: ${data.config.thinkingMode}`);
      agentFile.push(`- **Parallel Execution**: ${data.config.parallel}`);
      if (data.config.timeout) {
        agentFile.push(`- **Timeout**: ${data.config.timeout}ms`);
      }
      if (data.config.retries) {
        agentFile.push(`- **Retries**: ${data.config.retries}`);
      }

      if (data.inputs.length > 0) {
        agentFile.push(`\n## Inputs\n`);
        data.inputs.forEach((input) => {
          agentFile.push(`- \`${input}\``);
        });
      }

      if (data.outputs.length > 0) {
        agentFile.push(`\n## Outputs\n`);
        data.outputs.forEach((output) => {
          agentFile.push(`- \`${output}\``);
        });
      }

      if (data.successCriteria) {
        agentFile.push(`\n## Success Criteria\n`);
        agentFile.push(data.successCriteria);
      }

      agentFile.push(`\n## Prompt\n`);
      agentFile.push(data.promptTemplate);

      const filename = `agent-${this.sanitizeFilename(data.label)}.md`;
      files[filename] = agentFile.join('\n');
    });

    // Generate ZIP file
    return this.createZipExport(files, `${this.sanitizeFilename(workflow.name)}-claude-code.zip`);
  }

  // ==================== YAML EXPORTS ====================

  /**
   * CrewAI Export (YAML)
   * Format: agents.yaml + tasks.yaml + crew.py
   * Research: CrewAI v0.11.0+ standard format
   */
  private exportCrewAI(workflow: WorkflowGraph): ExportResult {
    const files: Record<string, string> = {};

    // Generate agents.yaml
    const agents = workflow.nodes.map((node) => {
      const data = node.data as AgentNodeData;
      return {
        [node.id]: {
          role: data.label,
          goal: data.description || `Execute ${data.role} tasks`,
          backstory: data.promptTemplate.split('\n').slice(0, 3).join(' '),
          llm: 'claude-sonnet-4.5',
          verbose: true,
          allow_delegation: data.config.parallel,
          max_iter: data.config.retries || 3,
          max_execution_time: data.config.timeout ? data.config.timeout / 1000 : 30,
        },
      };
    });

    const agentsYaml = yaml.dump(
      Object.assign({}, ...agents),
      {
        lineWidth: 120,
        noRefs: true,
        sortKeys: false,
      }
    );

    // Add comments to agents.yaml
    const agentsWithComments = this.addYamlComments(
      agentsYaml,
      `# CrewAI Agents Configuration\n# Generated from workflow: ${workflow.name}\n# Format: CrewAI v0.11.0+\n\n`
    );

    files['config/agents.yaml'] = agentsWithComments;

    // Generate tasks.yaml
    const tasks = workflow.nodes.map((node, index) => {
      const data = node.data as AgentNodeData;
      const outgoingEdges = workflow.edges.filter((e) => e.source === node.id);

      return {
        [`task_${index + 1}`]: {
          description: data.promptTemplate,
          expected_output: data.outputs.join(', ') || 'Task completion confirmation',
          agent: node.id,
          context: data.inputs.length > 0 ? data.inputs : undefined,
          async_execution: data.config.parallel,
          dependencies: outgoingEdges.map((e) => {
            const targetIndex = workflow.nodes.findIndex((n) => n.id === e.target);
            return `task_${targetIndex + 1}`;
          }).filter((_, i) => i < outgoingEdges.length),
        },
      };
    });

    const tasksYaml = yaml.dump(
      Object.assign({}, ...tasks),
      {
        lineWidth: 120,
        noRefs: true,
        sortKeys: false,
      }
    );

    const tasksWithComments = this.addYamlComments(
      tasksYaml,
      `# CrewAI Tasks Configuration\n# Generated from workflow: ${workflow.name}\n# Format: CrewAI v0.11.0+\n\n`
    );

    files['config/tasks.yaml'] = tasksWithComments;

    // Generate crew.py
    files['crew.py'] = this.generateCrewAICode(workflow);

    return this.createZipExport(files, `${this.sanitizeFilename(workflow.name)}-crewai.zip`);
  }

  /**
   * Standard YAML Export
   * Generic YAML format with full workflow graph
   */
  private exportStandardYAML(workflow: WorkflowGraph): ExportResult {
    const yamlData = {
      name: workflow.name,
      description: workflow.description,
      mode: workflow.mode,
      metadata: {
        created: new Date(workflow.createdAt).toISOString(),
        updated: new Date(workflow.updatedAt).toISOString(),
      },
      agents: workflow.nodes.map((node) => ({
        id: node.id,
        label: node.data.label,
        role: node.data.role,
        description: node.data.description,
        domain: node.data.domain,
        position: node.position,
        config: node.data.config,
        inputs: node.data.inputs,
        outputs: node.data.outputs,
        successCriteria: node.data.successCriteria,
        onFailure: node.data.onFailure,
        promptTemplate: node.data.promptTemplate,
      })),
      connections: workflow.edges.map((edge) => {
        const edgeData: Record<string, unknown> = {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.data?.label,
          condition: edge.data?.condition,
          priority: edge.data?.priority,
          transform: edge.data?.transform,
        };

        // Add edge properties if configured
        if (edge.data?.isLoopEdge) {
          edgeData.loop = {
            isLoopEdge: edge.data.isLoopEdge,
            loopId: edge.data.loopId,
            loopRole: edge.data.loopRole,
          };
        }

        if (edge.data?.retryPolicy) {
          edgeData.retryPolicy = edge.data.retryPolicy;
        }

        if (edge.data?.circuitBreaker?.enabled) {
          edgeData.circuitBreaker = edge.data.circuitBreaker;
        }

        if (edge.data?.fallback?.enabled) {
          edgeData.fallback = edge.data.fallback;
        }

        if (edge.data?.timeout) {
          edgeData.timeout = edge.data.timeout;
        }

        if (edge.data?.observability) {
          edgeData.observability = edge.data.observability;
        }

        if (edge.data?.communication) {
          edgeData.communication = edge.data.communication;
        }

        if (edge.data?.rateLimiting?.enabled) {
          edgeData.rateLimiting = edge.data.rateLimiting;
        }

        if (edge.data?.resourceLimits) {
          edgeData.resourceLimits = edge.data.resourceLimits;
        }

        if (edge.data?.security) {
          edgeData.security = edge.data.security;
        }

        // Advanced properties (tier 3)
        if (edge.data?.versioning) {
          edgeData.versioning = edge.data.versioning;
        }

        if (edge.data?.experiment) {
          edgeData.experiment = edge.data.experiment;
        }

        if (edge.data?.streaming?.enabled) {
          edgeData.streaming = edge.data.streaming;
        }

        if (edge.data?.eventDriven) {
          edgeData.eventDriven = edge.data.eventDriven;
        }

        if (edge.data?.costTracking?.enabled) {
          edgeData.costTracking = edge.data.costTracking;
        }

        if (edge.data?.performance) {
          edgeData.performance = edge.data.performance;
        }

        if (edge.data?.sla) {
          edgeData.sla = edge.data.sla;
        }

        if (edge.data?.advancedRouting) {
          edgeData.advancedRouting = edge.data.advancedRouting;
        }

        return edgeData;
      }),
    };

    const yamlContent = yaml.dump(yamlData, {
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
      indent: 2,
    });

    const contentWithComments = this.addYamlComments(
      yamlContent,
      `# Multi-Agent Workflow Configuration\n# Generated from: ${workflow.name}\n# Format: Standard YAML (2025)\n# Supports: All edge properties (Tier 1-3)\n\n`
    );

    return {
      format: 'yaml',
      content: contentWithComments,
      filename: `${this.sanitizeFilename(workflow.name)}.yaml`,
      mimeType: 'application/x-yaml',
    };
  }

  // ==================== JSON EXPORTS ====================

  /**
   * LangGraph Export (JSON)
   * Format: StateGraph-compatible JSON
   */
  private exportLangGraph(workflow: WorkflowGraph): ExportResult {
    const langGraphExport = {
      format: 'langgraph',
      version: '0.2.0',
      graph: {
        nodes: workflow.nodes.map((node) => ({
          id: node.id,
          name: node.data.label,
          type: node.data.role,
          config: {
            thinking_mode: node.data.config.thinkingMode,
            ...node.data.config,
          },
          prompt: node.data.promptTemplate,
        })),
        edges: workflow.edges.map((edge) => ({
          source: edge.source,
          target: edge.target,
          condition: edge.data?.condition,
          data: edge.data,
        })),
        state_schema: {
          type: 'object',
          properties: {
            objective: { type: 'string' },
            artifacts: { type: 'array' },
            decisions: { type: 'array' },
            nextAction: { type: 'string' },
          },
        },
      },
      orchestration_mode: workflow.mode,
    };

    const content = JSON.stringify(langGraphExport, null, 2);
    return {
      format: 'json',
      content,
      filename: `${this.sanitizeFilename(workflow.name)}-langgraph.json`,
      mimeType: 'application/json',
    };
  }

  /**
   * AutoGen Export (JSON)
   * Format: AutoGen conversation config
   */
  private exportAutoGen(workflow: WorkflowGraph): ExportResult {
    const autoGenExport = {
      format: 'autogen',
      version: '0.4.0',
      agents: workflow.nodes.map((node) => ({
        name: node.data.label,
        role: node.data.role,
        system_message: node.data.promptTemplate,
        llm_config: {
          model: 'claude-sonnet-4.5',
          temperature: node.data.config.thinkingMode === 'extended' ? 0.7 : 0.3,
          timeout: node.data.config.timeout || 30000,
        },
        human_input_mode: 'NEVER',
        max_consecutive_auto_reply: node.data.config.retries || 3,
      })),
      conversation_flow: workflow.edges.map((edge) => {
        const source = workflow.nodes.find((n) => n.id === edge.source);
        const target = workflow.nodes.find((n) => n.id === edge.target);
        return {
          from: source?.data.label,
          to: target?.data.label,
          condition: edge.data?.condition,
          message_type: edge.data?.communication?.messageType || 'sync',
        };
      }),
    };

    const content = JSON.stringify(autoGenExport, null, 2);
    return {
      format: 'json',
      content,
      filename: `${this.sanitizeFilename(workflow.name)}-autogen.json`,
      mimeType: 'application/json',
    };
  }

  /**
   * Temporal Export (JSON)
   * Format: Temporal workflow definition
   */
  private exportTemporal(workflow: WorkflowGraph): ExportResult {
    const temporalExport = {
      format: 'temporal',
      version: '1.0.0',
      workflow: {
        name: workflow.name,
        description: workflow.description,
        activities: workflow.nodes.map((node) => ({
          name: node.data.label,
          type: node.data.role,
          retry_policy: {
            maximum_attempts: node.data.config.retries || 3,
            initial_interval: '1s',
            maximum_interval: '100s',
            backoff_coefficient: 2.0,
          },
          start_to_close_timeout: `${(node.data.config.timeout || 30000) / 1000}s`,
        })),
        execution_graph: workflow.edges.map((edge) => {
          const source = workflow.nodes.find((n) => n.id === edge.source);
          const target = workflow.nodes.find((n) => n.id === edge.target);
          return {
            from_activity: source?.data.label,
            to_activity: target?.data.label,
            condition: edge.data?.condition,
            retry_policy: edge.data?.retryPolicy,
            timeout: edge.data?.timeout,
          };
        }),
      },
      orchestration_mode: workflow.mode,
    };

    const content = JSON.stringify(temporalExport, null, 2);
    return {
      format: 'json',
      content,
      filename: `${this.sanitizeFilename(workflow.name)}-temporal.json`,
      mimeType: 'application/json',
    };
  }

  /**
   * n8n Export (JSON)
   * Format: n8n workflow definition
   * Research: n8n v1.0+ workflow format
   */
  private exportN8N(workflow: WorkflowGraph): ExportResult {
    const n8nNodes = workflow.nodes.map((node, index) => {
      const data = node.data as AgentNodeData;

      return {
        parameters: {
          prompt: data.promptTemplate,
          model: 'claude-sonnet-4.5',
          options: {
            temperature: data.config.thinkingMode === 'extended' ? 0.7 : 0.3,
            maxTokens: 4096,
          },
          systemMessage: data.description || '',
        },
        name: data.label,
        type: 'n8n-nodes-langchain.agent',
        typeVersion: 1,
        position: [node.position.x, node.position.y] as [number, number],
        id: node.id,
        notes: data.domain ? `Domain: ${data.domain}` : '',
      };
    });

    const n8nConnections: Record<string, { main: Array<Array<{ node: string; type: string; index: number }>> }> = {};

    workflow.edges.forEach((edge) => {
      const sourceNode = workflow.nodes.find(n => n.id === edge.source);
      if (!sourceNode) return;

      if (!n8nConnections[sourceNode.data.label]) {
        n8nConnections[sourceNode.data.label] = { main: [[]] };
      }

      const targetNode = workflow.nodes.find(n => n.id === edge.target);
      if (targetNode) {
        n8nConnections[sourceNode.data.label].main[0].push({
          node: targetNode.data.label,
          type: 'main',
          index: 0,
        });
      }
    });

    const n8nWorkflow = {
      name: workflow.name,
      nodes: n8nNodes,
      connections: n8nConnections,
      settings: {
        executionOrder: workflow.mode === 'sequential' ? 'v1' : 'v0',
      },
      staticData: null,
      tags: [],
      triggerCount: 0,
      updatedAt: new Date(workflow.updatedAt).toISOString(),
      versionId: crypto.randomUUID(),
    };

    const content = JSON.stringify(n8nWorkflow, null, 2);
    return {
      format: 'json',
      content,
      filename: `${this.sanitizeFilename(workflow.name)}-n8n.json`,
      mimeType: 'application/json',
    };
  }

  /**
   * Standard JSON Export
   * Complete workflow graph as JSON
   */
  private exportStandardJSON(workflow: WorkflowGraph): ExportResult {
    const content = JSON.stringify(workflow, null, 2);
    return {
      format: 'json',
      content,
      filename: `${this.sanitizeFilename(workflow.name)}.json`,
      mimeType: 'application/json',
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Generate CrewAI Python code
   */
  private generateCrewAICode(workflow: WorkflowGraph): string {
    const code: string[] = [];

    code.push(`#!/usr/bin/env python3`);
    code.push(`"""${workflow.name}`);
    if (workflow.description) {
      code.push(workflow.description);
    }
    code.push(`"""\n`);

    code.push(`from crewai import Agent, Task, Crew, Process`);
    code.push(`from langchain_anthropic import ChatAnthropic\n`);

    code.push(`# Initialize LLM`);
    code.push(`llm = ChatAnthropic(model_name="claude-sonnet-4.5")\n`);

    code.push(`# Load agents from config/agents.yaml`);
    code.push(`# Load tasks from config/tasks.yaml\n`);

    code.push(`# Initialize Crew`);
    code.push(`crew = Crew(`);
    code.push(`    agents=[],  # Load from YAML`);
    code.push(`    tasks=[],   # Load from YAML`);
    code.push(`    process=Process.${workflow.mode === 'sequential' ? 'sequential' : 'hierarchical'},`);
    code.push(`    verbose=True,`);
    code.push(`)\n`);

    code.push(`if __name__ == "__main__":`);
    code.push(`    result = crew.kickoff()`);
    code.push(`    print(result)`);

    return code.join('\n');
  }

  /**
   * Add YAML comments header
   */
  private addYamlComments(yamlContent: string, header: string): string {
    return `${header}${yamlContent}`;
  }

  /**
   * Create ZIP file from multiple files
   */
  private createZipExport(files: Record<string, string>, filename: string): ExportResult {
    // Note: In browser environment, would use JSZip library
    // For now, return as multi-file structure for UI to handle
    return {
      format: 'zip',
      content: '', // Will be generated by UI using JSZip
      filename,
      files, // UI will use this to create ZIP
      mimeType: 'application/zip',
    };
  }

  /**
   * Sanitize filename for safe file system names
   */
  private sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

// Export singleton instance
export const specExportEngineV2 = new SpecExportEngineV2();
