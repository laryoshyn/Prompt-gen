import type { WorkflowGraph, WorkflowNode, WorkflowEdge, WorkflowValidationResult } from '@/types/workflow';

/**
 * Validate workflow graphs
 * Checks for circular dependencies, disconnected nodes, invalid configurations
 */

/**
 * Main validation function
 */
export function validateWorkflowGraph(graph: WorkflowGraph): WorkflowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for empty graph
  if (graph.nodes.length === 0) {
    errors.push('Workflow graph is empty. Add at least one agent node.');
    return { valid: false, errors, warnings };
  }

  // Check for circular dependencies
  const circularCheck = detectCircularDependencies(graph);
  if (!circularCheck.valid) {
    errors.push(...circularCheck.errors.map(e => `Circular dependency: ${e}`));
  }

  // Check for disconnected nodes
  const disconnectedNodes = findDisconnectedNodes(graph);
  if (disconnectedNodes.length > 0) {
    warnings.push(`Disconnected nodes found: ${disconnectedNodes.map(n => n.data.label).join(', ')}`);
  }

  // Check for missing inputs/outputs
  const ioCheck = validateInputsOutputs(graph);
  errors.push(...ioCheck.errors);
  warnings.push(...ioCheck.warnings);

  // Check for duplicate node IDs
  const duplicates = findDuplicateNodeIds(graph);
  if (duplicates.length > 0) {
    errors.push(`Duplicate node IDs: ${duplicates.join(', ')}`);
  }

  // Check for invalid edge connections
  const edgeCheck = validateEdges(graph);
  errors.push(...edgeCheck.errors);
  warnings.push(...edgeCheck.warnings);

  // Check for at least one entry point (node with no dependencies)
  const entryPoints = findEntryPoints(graph);
  if (entryPoints.length === 0) {
    errors.push('No entry point found. At least one node should have no incoming edges.');
  }

  // Check for at least one exit point (node with no dependents)
  const exitPoints = findExitPoints(graph);
  if (exitPoints.length === 0) {
    warnings.push('No clear exit point. Consider adding a finalizer node.');
  }

  // Validate individual node configurations
  graph.nodes.forEach(node => {
    const nodeErrors = validateNodeConfig(node);
    errors.push(...nodeErrors.map(e => `${node.data.label}: ${e}`));
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Detect circular dependencies using depth-first search
 */
function detectCircularDependencies(graph: WorkflowGraph): WorkflowValidationResult {
  const errors: string[] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) {
      // Found a cycle
      const cycleStart = path.indexOf(nodeId);
      const cycle = path.slice(cycleStart).concat(nodeId);
      const cycleNames = cycle.map(id => {
        const node = graph.nodes.find(n => n.id === id);
        return node?.data.label || id;
      });
      errors.push(cycleNames.join(' → '));
      return true;
    }

    if (visited.has(nodeId)) {
      return false;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    // Get all nodes this node depends on
    const dependencies = graph.edges
      .filter(edge => edge.target === nodeId)
      .map(edge => edge.source);

    for (const depId of dependencies) {
      if (dfs(depId)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    path.pop();

    return false;
  }

  // Check each node
  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
  };
}

/**
 * Find disconnected nodes (not reachable from entry points)
 */
function findDisconnectedNodes(graph: WorkflowGraph): WorkflowNode[] {
  if (graph.nodes.length === 0) return [];

  const entryPoints = findEntryPoints(graph);
  if (entryPoints.length === 0) {
    // If no clear entry point, all nodes are considered disconnected
    return [];
  }

  const reachable = new Set<string>();

  function traverse(nodeId: string) {
    if (reachable.has(nodeId)) return;
    reachable.add(nodeId);

    // Find all nodes this node connects to
    const outgoing = graph.edges
      .filter(edge => edge.source === nodeId)
      .map(edge => edge.target);

    outgoing.forEach(traverse);
  }

  // Traverse from all entry points
  entryPoints.forEach(node => traverse(node.id));

  // Find unreachable nodes
  return graph.nodes.filter(node => !reachable.has(node.id));
}

/**
 * Validate inputs and outputs
 */
function validateInputsOutputs(graph: WorkflowGraph): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  graph.nodes.forEach(node => {
    const { label, inputs, outputs, role } = node.data;

    // Check if node has outputs defined
    if (outputs.length === 0 && role !== 'finalizer') {
      warnings.push(`${label}: No outputs defined. Consider specifying artifact names.`);
    }

    // Check if node inputs are satisfied by dependencies
    if (inputs.length > 0) {
      const dependencies = graph.edges
        .filter(edge => edge.target === node.id)
        .map(edge => edge.source);

      if (dependencies.length === 0) {
        warnings.push(`${label}: Has input requirements but no incoming edges.`);
      } else {
        // Check if all inputs are provided by dependencies
        const availableOutputs = new Set<string>();
        dependencies.forEach(depId => {
          const depNode = graph.nodes.find(n => n.id === depId);
          depNode?.data.outputs.forEach(output => availableOutputs.add(output));
        });

        inputs.forEach(input => {
          if (!availableOutputs.has(input)) {
            warnings.push(`${label}: Input '${input}' not provided by dependencies.`);
          }
        });
      }
    }
  });

  return { errors, warnings };
}

/**
 * Find duplicate node IDs
 */
function findDuplicateNodeIds(graph: WorkflowGraph): string[] {
  const ids = new Set<string>();
  const duplicates: string[] = [];

  graph.nodes.forEach(node => {
    if (ids.has(node.id)) {
      duplicates.push(node.id);
    } else {
      ids.add(node.id);
    }
  });

  return duplicates;
}

/**
 * Validate edges
 */
function validateEdges(graph: WorkflowGraph): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const nodeIds = new Set(graph.nodes.map(n => n.id));

  graph.edges.forEach((edge, index) => {
    // Check if source and target exist
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge ${index}: Source node '${edge.source}' does not exist.`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge ${index}: Target node '${edge.target}' does not exist.`);
    }

    // Check for self-loops
    if (edge.source === edge.target) {
      errors.push(`Edge ${index}: Self-loop detected (node connects to itself).`);
    }

    // Validate conditional routing
    if (edge.data?.condition) {
      try {
        // Basic syntax check for condition
        new Function(`return ${edge.data.condition}`);
      } catch (e) {
        errors.push(`Edge ${index}: Invalid condition syntax: ${edge.data.condition}`);
      }
    }
  });

  return { errors, warnings };
}

/**
 * Find entry points (nodes with no incoming edges)
 */
function findEntryPoints(graph: WorkflowGraph): WorkflowNode[] {
  const nodesWithIncoming = new Set(graph.edges.map(e => e.target));
  return graph.nodes.filter(node => !nodesWithIncoming.has(node.id));
}

/**
 * Find exit points (nodes with no outgoing edges)
 */
function findExitPoints(graph: WorkflowGraph): WorkflowNode[] {
  const nodesWithOutgoing = new Set(graph.edges.map(e => e.source));
  return graph.nodes.filter(node => !nodesWithOutgoing.has(node.id));
}

/**
 * Validate individual node configuration
 */
function validateNodeConfig(node: WorkflowNode): string[] {
  const errors: string[] = [];
  const { label, role, promptTemplate, config } = node.data;

  // Check required fields
  if (!label || label.trim() === '') {
    errors.push('Label is required');
  }

  if (!role) {
    errors.push('Role is required');
  }

  if (!promptTemplate || promptTemplate.trim() === '') {
    errors.push('Prompt template is required');
  }

  // Validate config
  if (config.timeout && config.timeout < 0) {
    errors.push('Timeout must be positive');
  }

  if (config.retries && config.retries < 0) {
    errors.push('Retries must be non-negative');
  }

  return errors;
}

/**
 * Get validation suggestions
 */
export function getValidationSuggestions(graph: WorkflowGraph): string[] {
  const suggestions: string[] = [];

  // Suggest adding orchestrator for complex workflows
  if (graph.nodes.length > 5) {
    const hasOrchestrator = graph.nodes.some(n => n.data.role === 'orchestrator');
    if (!hasOrchestrator) {
      suggestions.push('Consider adding an Orchestrator node to coordinate this complex workflow.');
    }
  }

  // Suggest adding critic for important workflows
  const hasCritic = graph.nodes.some(n => n.data.role === 'critic');
  if (!hasCritic && graph.nodes.length > 2) {
    suggestions.push('Consider adding a Critic node to review outputs before finalization.');
  }

  // Suggest adding finalizer
  const hasFinalizer = graph.nodes.some(n => n.data.role === 'finalizer');
  if (!hasFinalizer && graph.nodes.length > 1) {
    suggestions.push('Consider adding a Finalizer node to aggregate results.');
  }

  // Suggest parallel execution for independent branches
  const parallelOpportunities = findParallelOpportunities(graph);
  if (parallelOpportunities.length > 0) {
    suggestions.push(`Consider running these agents in parallel: ${parallelOpportunities.join(', ')}`);
  }

  return suggestions;
}

/**
 * Find opportunities for parallel execution
 */
function findParallelOpportunities(graph: WorkflowGraph): string[] {
  const opportunities: string[] = [];
  const processed = new Set<string>();

  graph.nodes.forEach(node => {
    if (processed.has(node.id)) return;

    // Find nodes with same dependencies (can run in parallel)
    const nodeDeps = graph.edges
      .filter(e => e.target === node.id)
      .map(e => e.source)
      .sort();

    const parallel = graph.nodes.filter(other => {
      if (other.id === node.id || processed.has(other.id)) return false;

      const otherDeps = graph.edges
        .filter(e => e.target === other.id)
        .map(e => e.source)
        .sort();

      return nodeDeps.length === otherDeps.length &&
        nodeDeps.every((dep, i) => dep === otherDeps[i]);
    });

    if (parallel.length > 0) {
      const group = [node, ...parallel];
      opportunities.push(group.map(n => n.data.label).join(' + '));
      group.forEach(n => processed.add(n.id));
    }
  });

  return opportunities;
}
