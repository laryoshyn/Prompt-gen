/**
 * Tool Parallelization & Reflection Guidance
 * Based on Anthropic Deep Agents research (2024-2025)
 *
 * Key Finding: +54% performance improvement from:
 * 1. Parallel tool execution for independent operations
 * 2. Reflection after each tool use
 * 3. "Think" tool pattern for complex decisions
 */

export const TOOL_PARALLELIZATION_GUIDANCE = `
## Tool Parallelization Strategy 🚀

**Performance Boost:** Anthropic research shows +54% improvement with proper tool orchestration.

### When to Parallelize
Execute tools in parallel when they are **independent**:
- ✅ Multiple file reads from different locations
- ✅ Parallel web searches for different topics
- ✅ Independent database queries
- ✅ Multiple API calls to different services
- ❌ Sequential operations (one depends on another's output)

### How to Parallelize
\`\`\`
Claude 4.x automatically parallelizes independent tool calls when you:
1. Make multiple tool requests in the same response
2. Ensure tools don't depend on each other's outputs
3. Avoid sequential logic that requires ordered execution
\`\`\`

### Example: Parallel vs Sequential

**❌ Sequential (Slow):**
\`\`\`
1. Read file A
2. Read file B
3. Read file C
(3 round trips)
\`\`\`

**✅ Parallel (Fast):**
\`\`\`
Read files A, B, and C simultaneously
(1 round trip, 3x faster)
\`\`\`

### Implementation Guidance
\`\`\`markdown
When you need multiple independent pieces of information:
- Identify which operations are independent
- Make ALL independent tool calls in a single message
- Claude will automatically parallelize them
- Process results together after all tools complete
\`\`\`
`;

export const REFLECTION_PROTOCOL = `
## Reflection Protocol 💭

**Performance Boost:** Reflecting after tool use improves decision quality and error detection.

### After Each Tool Result
**ALWAYS** perform these reflection steps:

1. **Assess Quality**
   - Did the tool provide what you expected?
   - Is the information complete and accurate?
   - Are there any anomalies or surprises?

2. **Adjust Approach**
   - If results are incomplete → refine query/parameters
   - If results are unexpected → investigate why
   - If results are sufficient → proceed confidently

3. **Update Mental Model**
   - What did you learn from this result?
   - How does it affect your understanding?
   - What should you do differently next?

### Reflection Template
\`\`\`
<thinking>
Tool result analysis:
- What I expected: [...]
- What I got: [...]
- Quality assessment: [Good/Needs refinement/Unexpected]
- Next action: [Proceed/Refine/Investigate]
- Confidence level: [High/Medium/Low]
</thinking>
\`\`\`

### When to Reflect Deeply
Use **extended thinking** for:
- Complex analysis requiring multiple perspectives
- Decisions with significant downstream impact
- Unexpected or contradictory results
- Critical path operations
`;

export const THINK_TOOL_PATTERN = `
## "Think" Tool Pattern 🧠

**When to Use:** Complex decisions requiring deep reasoning before acting.

### Pattern Structure
\`\`\`markdown
Before making a critical decision:

<think>
## Problem Analysis
[Analyze the problem deeply]

## Options Considered
1. Option A: [pros/cons]
2. Option B: [pros/cons]
3. Option C: [pros/cons]

## Trade-offs
[Evaluate trade-offs systematically]

## Decision
[Make informed decision with rationale]

## Confidence
[High/Medium/Low] - [Why this confidence level?]
</think>

[Now take action based on thinking]
\`\`\`

### Use Cases
- Architectural decisions
- Algorithm selection
- Error handling strategies
- Resource allocation
- Risk mitigation approaches

### Benefits
- Transparent reasoning process
- Better decision quality
- Reduced errors
- Easier debugging
- Knowledge capture
`;

export const THINKING_MODE_GUIDANCE = {
  minimal: {
    when: 'Straightforward, well-defined tasks with clear solutions',
    pattern: 'Direct execution without extensive reasoning',
    example: 'Simple CRUD operations, basic data transformations, standard formatting',
    toolApproach: 'Execute tools directly, minimal reflection',
  },
  balanced: {
    when: 'Standard complexity tasks requiring some planning',
    pattern: 'Brief planning (2-3 steps), execute, reflect on key results',
    example: 'Code reviews, documentation, moderate analysis tasks',
    toolApproach: 'Plan tool sequence, parallelize independents, reflect on results',
  },
  extended: {
    when: 'Complex reasoning, high-stakes decisions, novel problems',
    pattern: 'Deep analysis before acting, systematic exploration, thorough reflection',
    example: 'System architecture, complex refactoring, novel algorithm design',
    toolApproach: 'Extensive planning, use "think" tool for decisions, deep reflection after each tool',
  },
};

/**
 * Generate tool parallelization guidance for agent templates
 */
export function generateToolGuidance(thinkingMode: 'minimal' | 'balanced' | 'extended'): string {
  const modeGuidance = THINKING_MODE_GUIDANCE[thinkingMode];

  return `
${TOOL_PARALLELIZATION_GUIDANCE}

${REFLECTION_PROTOCOL}

${thinkingMode === 'extended' ? THINK_TOOL_PATTERN : ''}

## Thinking Mode: ${thinkingMode.charAt(0).toUpperCase() + thinkingMode.slice(1)}
**When to use:** ${modeGuidance.when}
**Pattern:** ${modeGuidance.pattern}
**Tool Approach:** ${modeGuidance.toolApproach}

### Examples
${modeGuidance.example}
`;
}

/**
 * Execution order recommendations based on dependencies
 */
export interface ExecutionOrderGuidance {
  parallelBatches: string[][]; // Groups of operations that can run in parallel
  sequentialSteps: string[]; // Operations that must run in order
  criticalPath: string[]; // Longest dependency chain
}

export function analyzeExecutionOrder(operations: {
  name: string;
  dependencies: string[];
}[]): ExecutionOrderGuidance {
  const parallelBatches: string[][] = [];
  const sequentialSteps: string[] = [];
  const criticalPath: string[] = [];

  // Build dependency graph
  const graph = new Map<string, string[]>();
  operations.forEach(op => {
    graph.set(op.name, op.dependencies);
  });

  // Find operations with no dependencies (can run first)
  const noDeps = operations.filter(op => op.dependencies.length === 0);
  if (noDeps.length > 0) {
    parallelBatches.push(noDeps.map(op => op.name));
  }

  // Process in dependency order
  const processed = new Set<string>();
  noDeps.forEach(op => processed.add(op.name));

  while (processed.size < operations.length) {
    // Find operations whose dependencies are all processed
    const ready = operations.filter(op =>
      !processed.has(op.name) &&
      op.dependencies.every(dep => processed.has(dep))
    );

    if (ready.length === 0) break; // Circular dependency or error

    parallelBatches.push(ready.map(op => op.name));
    ready.forEach(op => processed.add(op.name));
  }

  // Build sequential steps (one representative from each batch)
  sequentialSteps.push(...parallelBatches.map(batch => batch[0]));

  // Find critical path (longest dependency chain)
  const findLongestPath = (node: string, visited = new Set<string>()): string[] => {
    if (visited.has(node)) return [];
    visited.add(node);

    const deps = graph.get(node) || [];
    if (deps.length === 0) return [node];

    const paths = deps.map(dep => findLongestPath(dep, new Set(visited)));
    const longest = paths.reduce((max, path) =>
      path.length > max.length ? path : max, []
    );

    return [...longest, node];
  };

  operations.forEach(op => {
    const path = findLongestPath(op.name);
    if (path.length > criticalPath.length) {
      criticalPath.splice(0, criticalPath.length, ...path);
    }
  });

  return { parallelBatches, sequentialSteps, criticalPath };
}
