## Prompt Generation Guide (Claude Sonnet 4.5 and General LLMs) — 2025 Edition

This guide provides a comprehensive, production-focused approach to crafting prompts and meta-prompts that generate high-quality prompts. It includes advanced techniques such as extended thinking, chain-of-thought reasoning, dynamic variables, chaining, reusability, tool-aware agent behaviors, agentic orchestration, structured outputs, verification, and guardrails, followed by ready-to-paste templates.

**Latest Updates (2025)**: Extended thinking patterns, Claude 4.x model-specific behaviors, JSON schema strict mode, conductor-style meta-prompting, agentic workflow patterns, and systematic evaluation frameworks.

### Core Principles (2025)
- **Be explicit**: Define role, objective, scope, constraints, and "what good looks like." Clear structure beats clever wording—most failures stem from ambiguity, not model limitations.
- **Structure over prose**: Use clearly labeled sections and strict output schemas. For Claude 4.x: bullets/lists need explicit requests; default output is paragraphs.
- **Context + motivation**: Explain *why* behavior matters helps models understand goals (especially Claude 4.x).
- **Reusability**: Parameterize with dynamic variables; keep optional blocks gated.
- **Iterate systematically**: Favor evaluation systems and measurement over one-shot attempts. Build on what works.
- **Guardrails first**: Put constraints, refusal rules, and verification before context.
- **Output determinism**: Specify exact formats, field names, and ordering. Use JSON schema strict mode when available.
- **Tool/agent awareness**: Describe when to use tools, parallelization, reflection after results, and orchestration patterns.
- **Model-specific optimization**: Different models (GPT-4o, Claude 4.5, Gemini 2.5) respond better to different patterns—tailor accordingly.
- **Extended thinking**: Guide reflection and reasoning steps explicitly; shorter thinking chains often outperform longer ones.

### Anatomy of a High-Quality Prompt
- **Role/Persona**: Who is the model acting as.
- **Objective**: One-sentence outcome statement.
- **Task Scope**: Boundaries, inclusions, exclusions, and what to ignore.
- **Inputs/Context**: Link or inline with delimiters and IDs; mark irrelevant items.
- **Constraints & Policies**: Privacy, compliance, standards, refusal triggers.
- **Output Format**: Schema/headings, type (JSON/XML/markdown), length and style caps.
- **Examples**: 1–3 positive examples; optional counter-examples.
- **Process & Verification**: Brief plan and a final checklist; no verbose reasoning.

### Extended Thinking & Reflection Patterns (2025)
Modern LLMs, especially Claude 4.x and reasoning models, benefit from explicit guidance on when and how to think:

- **Extended Thinking**: Prompt models to deeply consider and iterate on plans *before* generating responses. For Claude: "Before responding, carefully consider multiple approaches and their trade-offs."
- **Interleaved Thinking**: Request reflection after each tool result: "After each tool use, reflect on result quality and determine optimal next steps before proceeding."
- **The "Think" Tool Pattern**: For agentic workflows, enable a "think" capability where the agent can pause to reason. Studies show 54% improvement in complex tasks.
- **Shorter is Better**: Recent research (2025) shows longer thinking chains can degrade performance. Guide thinking efficiently: "Provide a concise 2-3 step plan before execution."
- **Self-Verification**: Include explicit reflection steps: "Verify your answer addresses all requirements before finalizing."
- **When NOT to Over-Think**: For simple tasks, avoid excessive reflection—it wastes tokens and can introduce errors.

**Example prompt pattern:**
```text
THINKING PROTOCOL:
1. Before responding: [2-3 bullet plan]
2. After tool results: Reflect on quality; adjust strategy if needed
3. Before finalizing: Verify completeness against requirements
4. Keep reasoning concise—avoid overthinking simple steps
```

### Chain-of-Thought Techniques
Chain-of-Thought (CoT) remains fundamental for complex reasoning:

**Standard CoT**: "Let's think step by step..." or "Show your reasoning before the final answer."

**Self-Consistency CoT**: Generate multiple reasoning paths, then select the most consistent answer:
```text
Generate 3 independent reasoning chains for this problem.
For each chain: [show step-by-step reasoning] → [answer]
Then: Select the most consistent answer across chains.
```

**One-Shot vs Few-Shot CoT (2025)**: For reasoning LLMs, one-shot CoT often outperforms few-shot:
```text
Example:
Q: If 5 machines make 5 widgets in 5 minutes, how long for 100 machines to make 100 widgets?
A: Let's break this down: [reasoning]... Answer: 5 minutes.

Now solve: [your problem]
```

**Structured CoT**: Enforce specific reasoning stages:
```text
Approach this problem in stages:
1. UNDERSTAND: Restate the problem in your own words
2. PLAN: Identify solution strategy (≤3 bullets)
3. EXECUTE: Work through step-by-step
4. VERIFY: Check answer against constraints
```

### Claude 4.x Model-Specific Behaviors
Claude Sonnet 4.5 and Opus 4.1 have distinct characteristics requiring tailored prompting:

**Explicit Requests for "Extra Mile" Behavior**: Claude 4.x is more conservative by default. Request proactive behavior explicitly:
```text
✗ "Create a dashboard"
✓ "Create a comprehensive analytics dashboard. Include as many relevant features and interactions as possible. Don't hold back—give it your all."
```

**Context & Motivation**: Explain *why* requirements matter:
```text
✗ "NEVER use ellipses"
✓ "Your response will be read aloud by text-to-speech, so never use ellipses or formatting that doesn't speak well."
```

**Formatting Defaults**: Claude 4.x avoids bullet points unless explicitly requested:
```text
✗ "Summarize key findings" → returns paragraphs
✓ "Summarize key findings as bulleted list" → returns bullets
```

**Direct Action Prompts**: Be directive for tool use:
```text
✗ "Can you suggest changes to this function?"
✓ "Refactor this function for better performance."
```

**Long-Horizon Reasoning**: Claude 4.5 excels at extended tasks across multiple context windows:
- Use structured state (JSON for data, text for notes)
- Prompt to save progress before context resets
- Focus on incremental progress: "Make steady advances; don't attempt everything at once"

**Tool Parallelization**: Claude 4.x automatically parallelizes independent tool calls; amplify with: "If tools have no dependencies, execute them in parallel."

**Conservative vs Proactive Modes**: Control autonomy level:
```text
Conservative: "Provide recommendations rather than taking action unless explicitly requested."
Proactive: "Identify issues and fix them autonomously; document changes."
```

**Minimizing Hallucinations**: Always investigate first:
```text
"Never speculate about code. Read files BEFORE answering questions. If information is unavailable, say so explicitly."
```

### Modern Agentic Workflow Patterns (2025)
The 2025 landscape emphasizes orchestrated, modular agent coordination:

**1. Planning & Execution Pattern**
```text
Workflow:
1. Plan: Generate multi-step execution plan
2. Execute: Run each stage sequentially
3. Review: Assess outcomes after each stage
4. Adapt: Adjust plan based on results

Prompt: "Break this task into stages. For each stage: (1) plan, (2) execute, (3) review quality, (4) adjust if needed."
```

**2. Orchestrator-Worker Pattern**
```text
Orchestrator: Central agent breaks down task, assigns to specialists, synthesizes results
Workers: Specialized agents execute specific subtasks

Prompt for orchestrator:
"Act as task coordinator. Break this complex task into specialized subtasks. For each subtask, specify: (1) required expertise, (2) inputs, (3) success criteria. Synthesize worker outputs into final deliverable."
```

**3. Reflection & Self-Improvement Pattern**
```text
After each action: Reflect on quality and adjust strategy
Prompt: "After completing each step: (1) evaluate result quality, (2) identify what worked/didn't, (3) adjust approach for remaining steps."
```

**4. Parallelization Pattern**
```text
Identify independent tasks → execute concurrently → merge results
Prompt: "Identify which subtasks are independent and can run in parallel. Execute parallel batches, then merge results."
```

**5. Tool-Use Orchestration**
```text
Available tools: {{tools}}
Policies: {{timeouts}}, {{rate_limits}}

When multiple independent lookups needed, run in parallel.
After each tool result:
- Reflect on sufficiency and reliability
- Decide: continue, retry, or finalize
```

**Leading Frameworks (2025)**: LangGraph (stateful graph orchestration), CrewAI (role-based agents), Microsoft Agent Framework (enterprise multi-agent systems).

### Evaluation & Measurement (2025)
You can't improve what you don't measure—build systematic evaluation into your workflow:

**Build Evaluation Systems**: Define metrics before optimizing prompts:
```text
Evaluation criteria:
- Accuracy: % of correct responses (target: >95%)
- Completeness: % covering all required fields (target: 100%)
- Format compliance: % matching schema exactly (target: 100%)
- Latency: Response time (target: <2s)
- Safety: % triggering guardrails appropriately (target: 100%)
```

**The GOLDEN Framework** (Goal, Output, Limits, Data, Evaluation, Next):
```text
Goal: [specific objective]
Output: [exact format/schema]
Limits: [constraints]
Data: [inputs/context]
Evaluation: [how success is measured]
Next: [what happens with output]
```

**Systematic Testing**:
```text
1. Create test set with diverse inputs (edge cases, malformed data, adversarial prompts)
2. Run prompt across test set
3. Measure against evaluation criteria
4. Identify failure patterns
5. Refine prompt to address failures
6. Repeat until targets met
```

**A/B Testing Prompts**: Test variants systematically:
```text
Variant A: [structured, strict]
Variant B: [flexible, creative]

Measure each against evaluation criteria on same test set.
Select winner or merge strengths.
```

**Avoid Common Mistakes**:
- ✗ Optimizing for demos with clean inputs vs. real messy data
- ✗ No systematic measurement—just vibes
- ✗ Using same prompt across different models without optimization
- ✗ Treating prompting as one-shot vs. iterative refinement

### Master Prompt-Generator (Meta-Prompt)
Use this single meta-prompt to generate ready-to-run task prompts with advanced features (dynamic variables, optional blocks, delegation, verification). Replace placeholders as needed.

```text
You are a Prompt Architect specializing in production-grade prompts for large language models (Claude Sonnet 4.5, GPT-4o, Gemini 2.5, and similar 2025-era models). Generate one or more ready-to-run prompts tailored to the inputs below; then critique and refine them; finally output a single recommended prompt.

[CONFIG / VARIABLES]
- model: {{model|default="claude-sonnet-4.5"}}
- audience: {{audience}}
- objective: {{objective}}
- task_scope: {{task_scope}}
- domain: {{domain}}
- inputs_summary: {{inputs_summary}}
- constraints: {{constraints}}
- output_format: {{output_format}}
- style_tone: {{style_tone}}
- length_limits: {{length_limits}}
- examples_positive: {{examples_positive?}}
- examples_negative: {{examples_negative?}}
- toolset: {{toolset?}}
- evaluation_bar: {{evaluation_bar}}
- risks_to_avoid: {{risks_to_avoid}}
- reusability_needs: {{reusability_needs?}}
- variables_catalog: {{variables_catalog?}}
- citations_policy: {{citations_policy?}}
- environment_limits: {{environment_limits?}}
- agentic_mode: {{agentic_mode|default="single"}}  # "single", "delegated", "orchestrated"
- thinking_mode: {{thinking_mode|default="balanced"}}  # "minimal", "balanced", "extended"
- evaluation_metrics: {{evaluation_metrics?}}  # specific measurable success criteria

[REQUIREMENTS]
- Produce a prompt that:
  1) States role/persona, goal, and success criteria for {{audience}} in {{domain}}.
  2) Is explicit about input boundaries and what to ignore.
  3) Enforces {{constraints}} and {{evaluation_bar}} up front.
  4) Specifies exact {{output_format}} with strict schema/headings and {{length_limits}}.
  5) Uses {{style_tone}} and avoids {{risks_to_avoid}}.
  6) Is reusable via {{variables_catalog?}} placeholders using {{variable_syntax|default="{{var}}"}}.
  7) Includes optional blocks only if corresponding data is present (examples, tools, citations).
  8) Applies {{thinking_mode}}: minimal (simple tasks), balanced (standard), extended (complex reasoning).
  9) For Claude 4.x: adds context/motivation for key requirements; explicit formatting requests.
  10) Includes model-specific optimizations based on {{model}}.
  11) Defines {{evaluation_metrics?}} for systematic measurement.
  12) Ends with a brief self-check/verification step.

[DELEGATION (if agentic_mode="delegated")]
- Architect: Draft 1–2 strong prompt candidates.
- Critic: Identify gaps vs {{evaluation_bar}}, {{constraints}}, {{risks_to_avoid}}.
- Red-Team: Stress-test ambiguity/loopholes; propose mitigations.
- Finalizer: Merge improvements into one best prompt.

[PROCESS]
1) Plan (≤3 bullets): identify key levers (role, scope, format, constraints).
2) Draft 1–2 prompt variants optimized for different trade-offs (structure vs flexibility).
3) Critique: gaps, risks, and fixes (≤6 bullets).
4) Refine into a single recommended prompt.
5) Verification checklist (≤6 bullets) mapped to {{evaluation_bar}}.
6) Output packaging.

[ADVANCED TECHNIQUES TO APPLY (2025)]
- Dynamic Variables with defaults: {{name|default="value"}}
- Optional Blocks gated by presence: <optional name="examples">…</optional>
- Extended Thinking: Guide reflection before/during/after key steps based on {{thinking_mode}}
- Chain-of-Thought: Apply CoT for complex reasoning; structured CoT stages for multi-step problems
- Self-Consistency: For critical decisions, generate multiple reasoning paths
- Iteration: If critical ambiguity detected, prepend Missing Info questions
- Tool Use (if {{toolset?}}): Describe when to call tools, parallelize independent calls, reflect on results after each tool use
- Agentic Orchestration (if agentic_mode="orchestrated"): Define Planning→Execution→Review cycles, Orchestrator-Worker roles
- Model-Specific Patterns: For Claude 4.x (explain motivation, explicit formatting); GPT-4o (memory utilization); Gemini (multimodal strength)
- Structured Outputs: Use JSON schema strict mode when available; enforce exact field names/types/order
- Guardrails: Allowed/Not Allowed; refusal cues; privacy rules
- Evaluation Integration: Build in measurement hooks for {{evaluation_metrics?}}
- Compression: Provide a compact production variant (≤X tokens) if budgeted

[OUTPUT FORMAT]
Return ONLY the following structure:

--- BEGIN
PLAN:
- [3 short bullets]

DRAFTS:
- VARIANT_A:
"""
[full prompt text with {{variables}} and optional blocks]
"""
- VARIANT_B:
"""
[alternate prompt with different trade-offs]
"""

CRITIQUE:
- [gaps/risks bullets]

FINAL_PROMPT:
"""
[one best prompt, ready to use; includes role, goal, inputs, constraints, output_format, verification; uses {{variables}} and optional blocks]
"""

VERIFICATION_CHECKLIST:
- [check against evaluation_bar/constraints/schema/length/risks]
--- END
```

### Section-by-Section Guidance
- **CONFIG / VARIABLES**: Centralize all adjustable parameters; add sensible defaults; keep names human-meaningful.
- **REQUIREMENTS**: Turn product needs into rules the final prompt must satisfy.
- **DELEGATION**: Use architect→critic→red-team→finalizer to improve coverage for high-stakes tasks.
- **PROCESS**: Plan→Draft→Critique→Refine→Verify yields quality without exposing hidden reasoning.
- **ADVANCED TECHNIQUES**: Dynamic variables, optional blocks, tool-aware steps, guardrails, and compression/budget variants.
- **OUTPUT FORMAT**: Enforces structure and ensures you always receive a single final prompt.

### Reusable Modules (Snippet Library)
- **Role block**
```text
ROLE: You are a senior {{domain}} specialist producing {{audience}}-ready outputs.
```
- **Constraints block**
```text
CONSTRAINTS:
- Policy/Privacy: {{constraints.policy}}
- Standards: {{constraints.standards}}
- Limits: {{length_limits}}, {{environment_limits}}
- Not Allowed: {{risks_to_avoid}}
```
- **Output-format block**
```text
OUTPUT_FORMAT:
- Type: {{output_format.type}}
- Schema/Headings: {{output_format.schema}}
- Style/Tone: {{style_tone}}
- Citations: {{citations_policy?}}
```
- **Verification block**
```text
VERIFY:
- Meets evaluation_bar: {{evaluation_bar}}
- Schema valid; no extra fields
- Within length limits
- Constraints satisfied; no banned content
```
- **Tools block (optional)**
```text
TOOLS:
- Available: {{toolset.list}}
- Use when: {{toolset.when}}
- Parallelize independent calls; reflect on results before proceeding
```

### Advanced Techniques (Deep Dive) — 2025 Edition
- **Dynamic variables & defaults**: Parameterize user-fillable slots as `{{var}}`; provide fallbacks with `{{var|default="..."}}`; document all variables in a catalog.
- **Optional blocks**: Wrap optional content in `<optional name="...">…</optional>` and include only when populated.
- **Extended thinking patterns**: Guide when/how to think deeply. For Claude 4.x: interleaved thinking after tool results (54% improvement). Balance: avoid overthinking simple tasks (2025 research shows shorter chains often better).
- **Chain-of-thought mastery**: Standard CoT for step-by-step; self-consistency for critical decisions (generate 3 paths, select most consistent); structured CoT with explicit stages (Understand→Plan→Execute→Verify). One-shot CoT outperforms few-shot for reasoning LLMs.
- **Chaining & iterative refinement**: Separate steps—requirements elicitation → variants → critique → finalization. Build evaluation systems; A/B test prompt variants.
- **Meta-prompting evolution**: Conductor-style (LLM orchestrates expert LLMs); APE (Automatic Prompt Engineer: generate candidates → score → refine); contrastive prompting (compare good/bad examples).
- **Agentic orchestration patterns (2025)**: Planning & Execution (plan→execute→review→adapt); Orchestrator-Worker (coordinator assigns specialists); Reflection & Self-Improvement (evaluate→learn→adjust); Parallelization (identify independent→execute concurrent→merge). Frameworks: LangGraph, CrewAI, Microsoft Agent Framework.
- **Tool use & parallelization**: Define tools, inputs, and when parallel calls are allowed; require reflection on results before next actions. Claude 4.x automatically parallelizes independent tools—amplify with explicit instruction.
- **Model-specific optimization (2025)**: Claude 4.x (add context/motivation, explicit formatting, direct action prompts, investigate before answering); GPT-4o (leverage persistent memory); Gemini 2.5 (multimodal strengths). Test same prompt across models = poor performance.
- **Structured outputs & JSON schema**: Use strict mode APIs (OpenAI, Anthropic, Gemini) for 100% schema compliance vs 35% with prompting alone. Provide exact schema; forbid extra fields; enforce stable key order.
- **Guardrails**: Explicit Allowed/Not Allowed, refusal triggers, privacy and compliance rules.
- **Evaluation & measurement**: Build evaluation systems BEFORE optimizing. Define metrics (accuracy, completeness, format compliance, latency, safety). Use GOLDEN framework (Goal, Output, Limits, Data, Evaluation, Next). A/B test variants systematically.
- **Compression & budget variants**: Provide a compact "production variant" to respect token/time budgets.
- **Context management**: Chunk large inputs; lead with objective; cite source IDs; ask for missing info only if critical.
- **Multimodal**: Specify what to extract from images/docs, what to ignore, and request confidence/ambiguity notes.
- **Prompt scaffolding**: Defensive prompting—wrap user inputs in structured templates that limit misbehavior; tell model how to think, respond, and decline inappropriate requests.

### Chain Prompt Micro-Templates
- **Step 1: Requirements elicitation**
```text
List missing info to design an optimal prompt for {{objective}} in {{domain}} for {{audience}}.
Return ≤7 targeted questions or say “Sufficient.”
```
- **Step 2: Draft variants**
```text
Produce two prompt variants (A structured, B flexible) with {{output_format}} and {{constraints}}. Cap each at ≤400 tokens.
```
- **Step 3: Critique**
```text
Critique both prompts against {{evaluation_bar}} and {{risks_to_avoid}}. Provide fixes (≤6 bullets).
```
- **Step 4: Finalize**
```text
Return a single best prompt, ready to run, with {{variables_catalog}} placeholders and a verification checklist.
```

### Task Templates (Ready-to-Use)
- **JSON extraction**
```text
Extract only what is present; do not fabricate. Output ONLY this JSON:
{
  "title": "string",
  "date_iso": "YYYY-MM-DD",
  "entities": [{"name":"string","type":"person|org|location"}],
  "summary": "≤60 words"
}

Input:
```DOC
[id=42]
[doc text...]
```DOC

Rules:
- No additional fields.
- If unknown, use null or [].
- Keep order stable.
- Validate keys exactly.
```

- **Code refactor/repair**
```text
You are a senior {{language}} engineer. Refactor for {{goals: readability, performance, standards}}.

Constraints:
- Follow {{standard: PEP 8, ESLint, etc.}}
- Preserve behavior and I/O
- Add concise docstrings; avoid trivial comments

Input code:
```LANG
[code...]
```

Output:
- Diff summary (≤5 bullets)
- New code (single fenced block)
- Tests (optional)

Verification:
- List edge cases covered and remaining risks (≤5 bullets)
```

- **Research / synthesis**
```text
Task: Produce a decision-ready brief.

Scope:
- Focus on {{subtopics}}; exclude {{non_scope}}
- Cite with [id] and list links at end

Output:
1) Executive summary (≤120 words)
2) Key findings (bullets)
3) Trade-offs/risks (bullets)
4) Recommendation (actionable bullets)
5) Sources (bulleted links)

Quality bar:
- No speculation; flag uncertainty
- Quote critical numbers with source IDs
```

- **Agent/tool-use orchestration**
```text
Tools available: {{tools}}. Policies: {{timeouts}}, {{rate_limits}}.

When multiple independent lookups are needed, run them in parallel. After each tool result:
- Reflect on sufficiency and reliability
- Decide next step or finalize

Output:
- Action log (concise)
- Final answer in {{format}}
- Open questions (if any)
```

### Bare-Bones Prompt-Generator (Minimal)
Paste and fill only the essentials.

```text
You are a Prompt Architect. Create a single, production-ready prompt for a language model.

Inputs:
- Audience: {{audience}}
- Objective: {{objective}} (1 sentence)
- Task scope: {{task_scope}}
- Domain: {{domain}}
- Constraints: {{constraints}} (policy/privacy/standards/limits)
- Output format: {{output_format}} (schema/headings; length {{length_limits}})
- Style/Tone: {{style_tone}}
- Examples (optional): {{examples_positive?}}
- Risks to avoid: {{risks_to_avoid}}
- Success criteria: {{evaluation_bar}}

Process (concise):
1) Draft plan (≤3 bullets).
2) Produce the final prompt (single block), using {{variables}} placeholders where end-users must fill values.
3) Add a ≤6-bullet verification checklist.

Output EXACTLY:
PLAN:
- [3 bullets]

FINAL_PROMPT:
"""
[ready-to-run prompt; includes role, goal, inputs/what to ignore, constraints, exact output_format with schema/length, brief verification step; uses {{variables}} where appropriate; optional sections only if provided]
"""

VERIFICATION_CHECKLIST:
- [schema valid; length respected; constraints satisfied; risks avoided; success criteria met]
```

### Ultra-Minimal One-Liner
```text
Create ONE ready-to-run prompt for {{objective}} in {{domain}} for {{audience}}, enforcing {{constraints}}, producing {{output_format}} within {{length_limits}}, in {{style_tone}}. Use {{variables}} placeholders where user input is needed. Include a brief verification step at the end of the prompt. Return ONLY the final prompt inside a single triple-quoted block.
```

### Troubleshooting & Anti-Patterns (2025)
**Common Mistakes to Avoid:**

- **Vague/ambiguous prompts**: Most failures stem from ambiguity, not model limitations. Be ruthlessly specific about role, objective, constraints, and format.
  - ✗ "Analyze this data"
  - ✓ "Act as data scientist. Analyze sales data for Q4 2024. Output: (1) 3 key trends, (2) statistical significance of each, (3) actionable recommendations. Format: bulleted list."

- **One-shot thinking**: Treating prompting as single attempt vs. iterative conversation. Build on what works; refine systematically.
  - **Fix**: Create test sets; measure performance; iterate based on failure patterns.

- **No evaluation systems**: "Prompt and pray" without measurement = can't improve.
  - **Fix**: Define metrics before optimizing. Track accuracy, completeness, format compliance, latency. A/B test variants.

- **Ignoring model-specific behaviors**: Using same prompt across GPT-4o, Claude 4.5, Gemini without optimization.
  - **Fix**: Claude 4.x needs explicit formatting requests and context/motivation. GPT-4o leverages memory. Test per model.

- **Demo optimization vs real usage**: Prompts work with clean test inputs but fail on messy real data.
  - **Fix**: Test with edge cases, malformed data, adversarial inputs. Build for production chaos.

- **Skipping role assignment**: Generic requests yield generic responses.
  - **Fix**: Assign specific expertise: "As senior security engineer..." vs. "As DevOps specialist..."

- **Overloading complexity**: Confusing the model with overly complex prompts.
  - **Fix**: Break complex tasks into stages. Use chaining or orchestration patterns.

- **Ignoring AI limitations**: Assuming model "knows" vs. generates patterns.
  - **Fix**: For Claude: "Never speculate. Read files BEFORE answering. If unavailable, say so explicitly."

- **Verbose fluff**: Set length caps; add "no preamble"; include terse example.

- **Hallucinated fields**: Provide exact schema; require "ONLY this JSON; no text outside." Use JSON schema strict mode (100% vs 35% compliance).

- **Missed constraints**: Place constraints before context; add verification checklist.

- **Shallow reasoning**: Request a 2–3 bullet plan and a short justification section. Apply structured CoT for complex problems.

- **Weak citations**: Provide source IDs and require claims to cite an ID.

- **Brittle formatting**: Specify headings/keys exactly; forbid extras; keep stable order.

- **Overthinking simple tasks**: Excessive reflection wastes tokens and introduces errors. Match thinking depth to task complexity.

### Checklists (2025)
- **Pre-run prompt quality check**
  - ✓ Objective and audience are explicit
  - ✓ Scope and exclusions defined; irrelevant inputs labeled
  - ✓ Constraints and refusal rules upfront
  - ✓ Output schema and length hard-specified (JSON schema strict mode if available)
  - ✓ Examples and tools blocks included only if provided
  - ✓ Model-specific optimizations applied (Claude 4.x: context/motivation, explicit formatting)
  - ✓ Thinking mode appropriate for task complexity (minimal/balanced/extended)
  - ✓ Evaluation metrics defined for measurement
  - ✓ Tool use guidance includes parallelization and reflection patterns
  - ✓ Role assignment specific and expertise-driven

- **Post-run output verification**
  - ✓ Output adheres to schema and ordering
  - ✓ Constraints satisfied; no banned content
  - ✓ Length limits respected
  - ✓ Claims cite sources if required
  - ✓ Risks to avoid are absent; success criteria met
  - ✓ No hallucinated fields or speculative data
  - ✓ Evaluation metrics tracked and recorded

- **Systematic improvement cycle**
  - ✓ Test set created with diverse inputs (edge cases, malformed data, adversarial)
  - ✓ Baseline performance measured against metrics
  - ✓ Failure patterns identified and categorized
  - ✓ Prompt refined to address specific failures
  - ✓ A/B test variants when appropriate
  - ✓ Performance improvement validated on test set
  - ✓ Document what worked for future reference

### Variables Catalog (2025 Edition)
Use this list in your prompts to document fillable fields for end users:

```text
Core variables:
{{model|default="claude-sonnet-4.5"}} | {{audience}} | {{objective}} | {{task_scope}} | {{domain}}
{{inputs_summary}} | {{constraints}} | {{output_format}} | {{style_tone}} | {{length_limits}}

Optional variables (include only if relevant):
{{examples_positive?}} | {{examples_negative?}} | {{toolset?}} | {{citations_policy?}}
{{environment_limits?}} | {{variables_catalog?}}

Evaluation & quality:
{{evaluation_bar}} | {{evaluation_metrics?}} | {{risks_to_avoid}}

2025 advanced variables:
{{agentic_mode|default="single"}}  # "single", "delegated", "orchestrated"
{{thinking_mode|default="balanced"}}  # "minimal", "balanced", "extended"
{{model_specific_optimizations?}}  # Claude 4.x, GPT-4o, Gemini 2.5 patterns
{{orchestration_pattern?}}  # Planning-Execution, Orchestrator-Worker, Parallelization
{{cot_strategy?}}  # "standard", "self-consistency", "structured", "one-shot"
{{tool_reflection?|default="after_each"}}  # "after_each", "batch", "none"
{{json_schema_strict?|default=true}}  # Use strict mode APIs when available
```

### Key 2025 Research Findings & Sources

**Extended Thinking & Reflection**
- Anthropic's "think" tool research (2025): 54% improvement in agentic task performance with explicit thinking steps
- DeepSeek-R1-Zero: Pure RL-trained model developing autonomous reasoning behaviors (self-verification, reflection)
- Recent studies show shorter thinking chains can outperform longer ones; avoid overthinking simple tasks

**Chain-of-Thought Evolution**
- One-shot CoT consistently outperforms Few-shot CoT for reasoning LLMs (2025)
- CoT reduces excessive reflections by ~90% in reasoning models
- Self-consistency prompting generates multiple paths and selects most consistent answer

**Model-Specific Behaviors**
- Claude 4.x (Sonnet 4.5, Opus 4.1): More conservative by default; benefits from explicit context/motivation; avoids bullets unless requested
- Different models (GPT-4o, Claude 4.5, Gemini 2.5) respond to different formatting patterns—no universal best practice

**Structured Outputs**
- JSON schema strict mode achieves 100% compliance vs. 35% with prompting alone (OpenAI, Anthropic, Gemini APIs)
- SchemaBench (2025): Latest LLMs still struggle with complex JSON schemas without strict mode

**Agentic Workflows**
- 25% of enterprises using GenAI plan to deploy AI agents in 2025 (Deloitte)
- Agentic AI market: $5.1B (2024) → projected $47B by 2030 (44% annual growth)
- Leading frameworks: LangGraph (stateful graph orchestration), CrewAI (role-based), Microsoft Agent Framework (enterprise multi-agent)

**Meta-Prompting**
- Conductor-style meta-prompting: LLM orchestrates expert LLMs for complex tasks
- APE (Automatic Prompt Engineer): Generate candidates → score → refine iteratively
- Meta-prompting on MATH dataset: Qwen-72B achieved 46.3% accuracy, surpassing initial GPT-4 (42.5%)

**Common Anti-Patterns**
- Most prompt failures stem from ambiguity, not model limitations (2025 consensus)
- Optimizing for demos with clean inputs (vs. real messy data) is #1 enterprise mistake
- No evaluation systems = "prompt and pray" = cannot systematically improve

### Document Version & Updates
- **Version**: 2.0 (2025 Edition)
- **Last Updated**: January 2025
- **Key Changes from v1.0**: Added extended thinking patterns, Chain-of-Thought techniques, Claude 4.x model-specific behaviors, modern agentic workflow patterns, evaluation & measurement frameworks, 2025 anti-patterns, structured outputs with JSON schema strict mode, updated meta-prompting techniques.

---

*This guide synthesizes best practices from official documentation (Anthropic, OpenAI, Google), academic research (2024-2025), and production experience across enterprise AI deployments. Continuously updated as the field evolves.*

