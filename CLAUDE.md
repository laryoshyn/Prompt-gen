# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Prompt-Gen** is an interactive prompt engineering assistant that helps users create production-grade prompts for Large Language Models (Claude Sonnet 4.5, GPT-4o, Gemini 2.5, etc.). The project takes a consultative approach, helping users discover and articulate their requirements through guided questions—even when users don't fully understand their own needs.

## Core Philosophy

This is NOT a static template library. The project is designed to:
- Engage in dialogue to uncover true requirements beyond surface requests
- Educate users about 2025 prompt engineering best practices during interaction
- Generate multiple prompt variants, critique them, and iteratively refine
- Build evaluation and measurement into prompts from the start
- Optimize for production readiness (real messy data) not demo readiness (clean examples)

## Architecture

The codebase is currently documentation-driven, consisting of two primary knowledge artifacts:

### 1. **PROMPT-GENERATION-GUIDE.md** (Core Knowledge Base)
The comprehensive prompt engineering guide covering:

**Foundation (Lines ~7-27)**: Core principles emphasizing explicitness, structure, model-specific optimization, systematic iteration, and extended thinking patterns

**Advanced Techniques (Lines ~29-217)**:
- Extended Thinking & Reflection Patterns: When/how to use thinking protocols, interleaved thinking, "think" tool patterns
- Chain-of-Thought Techniques: Standard CoT, self-consistency, structured stages, one-shot vs few-shot
- Claude 4.x Model-Specific Behaviors: Conservative defaults, context/motivation requirements, formatting expectations, tool parallelization
- Modern Agentic Workflow Patterns: Planning & Execution, Orchestrator-Worker, Reflection & Self-Improvement, Parallelization
- Evaluation & Measurement: GOLDEN framework, systematic testing, A/B testing methodology

**Meta-Prompt Generator (Lines ~219-310)**: Production meta-prompt template with 2025 advanced features:
- Dynamic variables with defaults: `{{var|default="value"}}`
- Optional blocks: `<optional name="...">...</optional>`
- Thinking modes: minimal/balanced/extended
- Agentic modes: single/delegated/orchestrated
- Model-specific optimization hooks
- Evaluation metrics integration

**Reusable Modules (Lines ~328-366)**: Snippet library for Role, Constraints, Output Format, Verification, Tools blocks

**Task Templates (Lines ~405-485)**: Ready-to-use patterns for JSON extraction, code refactoring, research synthesis, agent orchestration

**Anti-Patterns & Troubleshooting (Lines ~527-567)**: Common mistakes with fixes, emphasizing systematic measurement over "prompt and pray"

**Checklists (Lines ~569-598)**: Pre-run quality checks, post-run verification, systematic improvement cycles

**Research References (Lines ~625-658)**: 2025 findings on extended thinking (54% improvement), CoT evolution, model-specific behaviors, structured outputs (100% vs 35% compliance), agentic market growth

### 2. **PURPOSE.md** (Project Vision)
Articulates the "why" and "how" of interactive prompt generation:
- Problem statement: Users have unclear requirements, missing context, optimization gaps
- Approach: Guided discovery, requirement elicitation, education through interaction, iterative refinement
- Example interaction flow showing vague request → detailed prompt
- Success metrics and long-term vision

## Key Design Patterns

### Variable Syntax
```text
{{variable}}                    # Required variable
{{variable?}}                   # Optional variable
{{variable|default="value"}}    # Variable with default
```

### Thinking Mode Selection
- **minimal**: Simple, straightforward tasks where reflection adds no value
- **balanced**: Standard approach with concise planning (2-3 bullets)
- **extended**: Complex reasoning requiring deep consideration before acting

### Agentic Orchestration
- **single**: Direct prompt execution
- **delegated**: Architect→Critic→Red-Team→Finalizer roles
- **orchestrated**: Multi-agent patterns (Planning-Execution, Orchestrator-Worker)

### Model-Specific Optimization Flags
When generating prompts, apply these model-specific patterns:
- **Claude 4.x**: Add context/motivation for key requirements; explicit formatting requests; direct action language; "investigate before answering" pattern
- **GPT-4o**: Leverage persistent memory capabilities
- **Gemini 2.5**: Optimize for multimodal strengths

## Working with the Guide

### When Adding New Techniques
1. Research-back the technique (include source/findings in Research References section)
2. Add practical example, not just theory
3. Update relevant sections: Core Principles, Advanced Techniques, Meta-Prompt template variables, Checklists
4. Include anti-patterns (what NOT to do) alongside best practices
5. Consider model-specific implications

### When Updating for New Models
1. Add model-specific section under "Model-Specific Behaviors"
2. Update default model in meta-prompt (currently `claude-sonnet-4.5`)
3. Document formatting preferences, thinking patterns, tool use behaviors
4. Add to Model-Specific Optimization guidance
5. Update Variables Catalog with any new model-specific parameters

### Version Control
- Current version: 2.0 (2025 Edition)
- Update "Last Updated" date when making substantial changes
- Document key changes in "Document Version & Updates" section

## When Interacting with Users

**Follow this flow:**

1. **Understand the Request**: What does the user think they want?

2. **Probe for True Needs** (Requirement Elicitation):
   - Actual objective (not just surface task)?
   - Audience and quality bar?
   - Domain and constraints?
   - Success criteria (measurable)?
   - Edge cases and failure modes?
   - Downstream usage of outputs?

3. **Educate During Discovery**:
   - Introduce relevant techniques they may not know
   - Explain model-specific behaviors that affect their use case
   - Highlight importance of evaluation/measurement

4. **Generate Variants**:
   - Use meta-prompt generator from guide
   - Create 1-2 variants with different trade-offs
   - Apply appropriate thinking_mode and agentic_mode

5. **Critique Against Requirements**:
   - Alignment with objectives
   - Robustness to edge cases
   - Model-specific optimizations
   - Production readiness

6. **Iterative Refinement**:
   - Present variants with trade-offs explained
   - Refine based on user feedback
   - Build in evaluation hooks

7. **Deliver with Context**:
   - Final prompt with variables documented
   - Verification checklist
   - Testing guidance
   - Iteration strategy

## Important Conventions

### Research-Backed Claims
When stating performance improvements or best practices, cite the research (see "Key 2025 Research Findings & Sources" section). Example: "54% improvement in agentic task performance" links to Anthropic's "think" tool research.

### Avoid Over-Complication
Match complexity to task:
- Simple extraction → minimal thinking, direct schema
- Complex reasoning → structured CoT, extended thinking
- Multi-agent workflow → orchestration patterns

### Structured Outputs Priority
When JSON output is needed, always recommend JSON schema strict mode (100% compliance) over prompting alone (35% compliance).

### Evaluation-First Mindset
Every prompt should include or suggest:
- Measurable success criteria
- Testing strategy with diverse inputs (edge cases, malformed data, adversarial)
- Verification checklist

## Settings

The repository has WebSearch enabled in `.claude/settings.local.json` for researching latest prompt engineering developments. Use this to:
- Verify latest model capabilities and updates
- Research new techniques or frameworks
- Find recent best practices or benchmarks
- Cross-reference academic findings

When updating the guide with new research, always include sources in the "Key 2025 Research Findings & Sources" section.
