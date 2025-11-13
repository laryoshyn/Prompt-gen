# Custom Agents Guide

The Prompt-Gen workflow builder now supports **custom agents** that can be loaded from markdown files or imported from your Prompt Library. This allows you to create specialized agents tailored to your specific needs while maintaining the power of the visual workflow builder.

## Overview

### What are Custom Agents?

Custom agents are user-defined prompt templates that can be used in workflows alongside the 11 built-in agent types (Orchestrator, Architect, Critic, etc.). They allow you to:

- **Create specialized agents** for domain-specific tasks
- **Reuse prompts** from your Prompt Library in workflows
- **Share agent templates** as portable .md files
- **Build custom agent libraries** for your organization

### Features

✅ **Two loading methods**: Upload .md files or import from Prompt Library
✅ **Markdown-based format**: Simple, human-readable agent definitions
✅ **YAML frontmatter**: Structured metadata for agent configuration
✅ **Full validation**: Ensures agents meet quality standards
✅ **Visual management**: Add, view, and delete custom agents in the palette
✅ **Drag-and-drop**: Works seamlessly with existing workflow builder
✅ **Persistent storage**: Custom agents saved in IndexedDB

## Creating Custom Agent Files

### File Format

Custom agents use **markdown files with YAML frontmatter**:

```markdown
---
name: Agent Name
role: researcher
description: Brief description of what this agent does
thinkingMode: extended
parallel: false
tags: [tag1, tag2, tag3]
domain: Optional domain specification
---

# Agent Prompt Template

Your prompt content goes here...

Use {{variables}} for dynamic content.

## Sections

Structure your prompt with clear sections.
```

### Frontmatter Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ Yes | Display name for the agent (shown in palette) |
| `role` | string | ⚠️ Optional | Agent role (defaults to 'worker' if not specified)<br>Valid values: `orchestrator`, `architect`, `critic`, `red-team`, `researcher`, `coder`, `tester`, `writer`, `worker`, `finalizer`, `loop` |
| `description` | string | ✅ Yes | Brief description of agent's purpose |
| `thinkingMode` | string | ⚠️ Optional | Thinking protocol intensity<br>Options: `minimal`, `balanced`, `extended`<br>Default: `balanced` |
| `parallel` | boolean | ⚠️ Optional | Enable parallel tool execution<br>Default: `false` |
| `tags` | array | ⚠️ Optional | Categorization tags for organization<br>Format: `[tag1, tag2]` |
| `domain` | string | ⚠️ Optional | Specialization domain (e.g., "Academic Research") |

### Prompt Template Body

The content after the frontmatter (`---`) is your agent's prompt template. Best practices:

#### 1. Use Variable Placeholders
```markdown
{{variable}}                    # Required variable
{{variable|default="value"}}    # Variable with default
```

#### 2. Structure with Headers
```markdown
## Objective
## Context
## Instructions
## Output Format
## Quality Standards
```

#### 3. Include Thinking Protocols
For complex agents, add explicit thinking guidance:
```markdown
<thinking>
Before responding:
1. Analyze the requirements
2. Consider edge cases
3. Plan the approach
</thinking>
```

#### 4. Document Variables
List all variables at the end:
```markdown
## Variables
- **{{objective}}**: The main task (Required)
- **{{domain}}**: Specific domain (Default: "General")
```

## Example Agents

### Example 1: Academic Researcher

**File:** `academic-researcher.md`

```markdown
---
name: Academic Researcher
role: researcher
description: Specialized agent for conducting thorough academic research
thinkingMode: extended
parallel: false
tags: [research, academic, citations]
domain: Academic Research
---

# Academic Research Agent

You are a specialized academic researcher with expertise in literature reviews.

## Objective
{{objective}}

## Research Protocol

### 1. Literature Search Strategy
- Identify key search terms
- Search academic databases
- Apply inclusion/exclusion criteria

### 2. Source Evaluation
Assess each source for:
- Credibility (peer-reviewed?)
- Relevance to research question
- Recency and impact

### 3. Synthesis
<thinking>
Before synthesizing:
1. Identify themes across sources
2. Note conflicting findings
3. Assess evidence strength
</thinking>

## Output Format
- Executive summary
- Key findings by theme
- Full bibliography (APA format)

## Quality Standards
- Minimum 10 high-quality sources
- 70% peer-reviewed
- All claims cited
```

**Use cases:**
- Literature reviews
- Research synthesis
- Evidence gathering
- Academic writing support

### Example 2: Professional Email Writer

**File:** `email-writer.md`

```markdown
---
name: Professional Email Writer
role: writer
description: Crafts clear, effective business emails
thinkingMode: minimal
parallel: false
tags: [writing, email, business]
---

# Professional Email Writer

You are an expert at crafting professional business emails.

## Task
Write a professional email for: {{purpose}}

## Context
- **Recipient**: {{recipient}}
- **Tone**: {{tone|default="Professional and friendly"}}

## Email Structure
1. Subject: Clear and specific
2. Greeting: Appropriate for relationship
3. Body: Key points, concisely organized
4. Closing: Clear call-to-action

## Output
Complete email ready to send.
```

**Use cases:**
- Business correspondence
- Customer communication
- Internal memos
- Follow-up emails

## Using Custom Agents

### Method 1: Upload .md Files

1. **Navigate to Workflow Builder**
   - Open the workflow builder interface
   - Agent Palette is on the left side

2. **Upload Files**
   - Click **"📄 Upload .md Files"** button
   - Select one or multiple `.md` files
   - Files are validated automatically

3. **View Custom Agents**
   - Successfully loaded agents appear in "Custom Agents" section
   - Distinguished by purple styling
   - Shows source icon: 📄 (file), 📚 (library), or 👤 (user)

4. **Use in Workflows**
   - Drag custom agent from palette to canvas
   - Configure like any built-in agent
   - Connect to other nodes

### Method 2: Import from Prompt Library

1. **Create Prompts**
   - Use the Prompt Builder to create prompts
   - Save to Prompt Library

2. **Import to Workflows**
   - In Workflow Builder, click **"📚 Import from Library"**
   - All saved prompts are converted to custom agents
   - Automatically appears in Custom Agents section

3. **Conversion Process**
   - Prompt form fields → Structured prompt template
   - Variables preserved
   - ThinkingMode maintained
   - Domain becomes agent specialization

### Managing Custom Agents

#### Delete Custom Agents
- Hover over custom agent card
- Click **✕** button in top-right corner
- Confirm deletion (cannot be undone)

#### View Agent Details
- Custom agents show:
  - Name
  - Description
  - Source (file/library/user)
  - Visual indicator (purple styling)

#### Re-import
- Re-uploading same file overwrites existing agent
- Use this to update agent definitions

## Validation Rules

Custom agents are validated on upload. Requirements:

✅ **Name**: Must be non-empty
✅ **Description**: Must be non-empty
✅ **Prompt Template**: Minimum 50 characters
✅ **Role**: Must be valid AgentRole (if specified)
✅ **Frontmatter**: Must be valid YAML format

### Common Validation Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Invalid markdown format" | Missing or malformed frontmatter | Ensure `---\n...\n---` structure |
| "Missing required field: name" | No `name:` in frontmatter | Add `name: Agent Name` |
| "Missing required field: description" | No `description:` | Add brief description |
| "Prompt template seems too short" | Template < 50 chars | Add more detailed instructions |
| "Agent with name X already exists" | Duplicate name | Rename agent or delete existing |

## Best Practices

### 1. Naming Conventions
- **Be specific**: "Academic Researcher" not "Researcher"
- **Include domain**: "Legal Contract Analyst" not "Analyst"
- **Avoid generic names**: "Email Writer" → "Professional Email Writer"

### 2. Description Quality
- **One line summary**: What does this agent do?
- **Target audience**: Who would use this?
- **Key differentiator**: What makes it special?

**Good:**
> "Specialized agent for conducting thorough academic research with citation tracking"

**Bad:**
> "Does research"

### 3. Prompt Template Structure
Follow this template:

```markdown
# Agent Name

Brief introduction.

## Objective
{{objective}}

## Context/Domain
{{domain}}

## Instructions
Step-by-step process.

## Output Format
Clear specification of deliverables.

## Quality Standards
Success criteria.

## Variables
Document all variables.
```

### 4. Variable Usage
- **Required variables**: Use `{{var}}` syntax
- **Optional with defaults**: Use `{{var|default="value"}}`
- **Document all variables**: Add Variables section at end
- **Use semantic names**: `{{research_topic}}` not `{{input}}`

### 5. Thinking Mode Selection

| Mode | Use When | Example Agents |
|------|----------|----------------|
| `minimal` | Simple, straightforward tasks | Email writer, formatter |
| `balanced` | Most agents, standard complexity | Content creator, analyzer |
| `extended` | Complex reasoning, deep analysis | Academic researcher, architect |

### 6. Tags for Organization
Use consistent tags across your custom agents:

- **Function**: `research`, `writing`, `analysis`, `coding`
- **Domain**: `legal`, `medical`, `academic`, `business`
- **Output**: `report`, `code`, `document`, `data`
- **Source**: `prompt-library`, `custom`, `team`

## Technical Details

### Storage Architecture

```
IndexedDB: prompt-gen-db (v2)
├── custom-agents (object store)
│   ├── id (key)
│   ├── name (indexed)
│   ├── source (indexed)
│   ├── role (indexed)
│   └── createdAt (indexed)
└── ... (other stores)
```

### Agent Registry
- **Singleton pattern**: `agentRegistry` manages all agents
- **Merge strategy**: Built-in + Custom agents
- **Real-time updates**: React to changes via subscription
- **Validation**: On add, update, delete operations

### Integration Points

#### 1. AgentPalette Component
- Displays custom agents in separate section
- File upload via hidden `<input type="file">`
- Import from library via async function
- Delete with confirmation dialog

#### 2. WorkflowBuilder Component
- Accepts both `AgentRole` and custom agent IDs
- Resolves via `agentRegistry.getAgent(id)`
- Falls back to built-in templates

#### 3. WorkflowStore
- `addNode(typeOrId, position)` supports both types
- Creates WorkflowNode from AgentTemplate
- Validates and persists to localStorage

### File Format Specification

**MIME Type:** `text/markdown`
**Extension:** `.md`
**Encoding:** UTF-8

**Structure:**
```
YAML Frontmatter (required)
├── Delimiter: ---
├── Key-value pairs (YAML syntax)
└── Delimiter: ---

Markdown Content (required)
├── Headers (##)
├── Paragraphs
├── Lists
├── Code blocks
└── Variable placeholders {{var}}
```

## Troubleshooting

### Agent Not Appearing in Palette

**Possible causes:**
1. Validation failed (check error message)
2. Duplicate name (rename or delete existing)
3. Invalid file format (check frontmatter)

**Solutions:**
- Check browser console for detailed errors
- Verify frontmatter syntax (use YAML validator)
- Ensure all required fields present

### Import from Library Shows "No prompts found"

**Cause:** Prompt Library is empty

**Solution:**
1. Go to Prompt Builder
2. Create and save at least one prompt
3. Return to Workflow Builder
4. Try import again

### Custom Agent Not Working in Workflow

**Possible causes:**
1. Missing required variables
2. Invalid prompt template
3. Incorrect role specified

**Solutions:**
- Test agent independently first
- Provide all required variables
- Use `worker` role for general-purpose agents

### Delete Button Not Visible

**Cause:** Not hovering over custom agent card

**Solution:**
- Hover over the custom agent card
- Delete button (✕) appears in top-right corner
- Click to delete (requires confirmation)

## Advanced Usage

### Organization Strategies

#### 1. Domain-Specific Libraries
Create agent libraries for each domain:

```
agents/
├── legal/
│   ├── contract-analyzer.md
│   ├── case-law-researcher.md
│   └── brief-writer.md
├── medical/
│   ├── clinical-researcher.md
│   ├── patient-educator.md
│   └── medical-coder.md
└── business/
    ├── market-analyst.md
    ├── financial-modeler.md
    └── strategic-planner.md
```

#### 2. Role-Based Templates
Create specialized versions of built-in roles:

- `researcher` → Academic Researcher, Market Researcher, Legal Researcher
- `writer` → Technical Writer, Content Writer, Grant Writer
- `coder` → Frontend Developer, Backend Developer, DevOps Engineer

#### 3. Workflow-Specific Agents
Create agents for recurring workflows:

```markdown
agents/
└── content-pipeline/
    ├── topic-ideator.md
    ├── outline-generator.md
    ├── content-writer.md
    ├── fact-checker.md
    └── seo-optimizer.md
```

### Sharing Custom Agents

#### Export Individual Agents
Custom agents are stored as `.md` files, making them easy to share:

1. Locate agent file in `example-agents/` directory
2. Share via:
   - Email attachment
   - Git repository
   - Internal wiki
   - Shared drive

#### Export Agent Collections
Create ZIP archives of related agents:

```bash
# Create collection
zip -r legal-agents.zip agents/legal/

# Share with team
# Recipients can upload all files at once
```

#### Version Control
Track agent evolution:

```markdown
---
name: Academic Researcher
version: 2.1.0
updated: 2025-11-12
changelog: Added citation validation step
---
```

### Testing Custom Agents

Before deploying custom agents in production workflows:

#### 1. Standalone Testing
- Create simple test workflow with just the custom agent
- Provide sample inputs
- Verify output quality

#### 2. Variable Testing
Test all variable combinations:
- Required variables only
- Optional variables with defaults
- Optional variables with custom values
- Edge cases (empty, very long, special characters)

#### 3. Integration Testing
- Test in multi-agent workflows
- Verify artifact passing
- Check error handling

## Migration Guide

### From Form-Based Prompts

If you have prompts created in the Prompt Builder:

**Option 1: Import Directly**
1. Use "Import from Library" button
2. All prompts converted automatically
3. Review and test converted agents

**Option 2: Manual Migration**
1. Export prompt from library
2. Convert to markdown format
3. Add custom enhancements
4. Upload as new agent

**Conversion mapping:**
```
PromptFormData → CustomAgent
├── name → name
├── objective → description (truncated)
├── domain → domain
├── thinkingMode → thinkingMode
├── variables → variables (preserved)
└── all fields → prompt template sections
```

### From External Prompt Libraries

If you have prompts in other formats:

#### From JSON
```javascript
// Convert JSON prompt to markdown
const prompt = JSON.parse(jsonContent);
const markdown = `---
name: ${prompt.name}
description: ${prompt.description}
---

${prompt.template}
`;
```

#### From Plain Text
1. Add YAML frontmatter at top
2. Structure with markdown headers
3. Add variable placeholders
4. Document variables section

## API Reference

### CustomAgent Interface

```typescript
interface CustomAgent extends AgentTemplate {
  source: 'file' | 'prompt-library' | 'user';
  isCustom: true;
  createdAt: number;
  updatedAt: number;
  originalFileName?: string;
}
```

### AgentRegistry Methods

```typescript
// Get all agents (built-in + custom)
agentRegistry.getAllAgents(): AgentTemplate[]

// Get specific agent
agentRegistry.getAgent(id: string): AgentTemplate | undefined

// Get by role
agentRegistry.getAgentByRole(role: AgentRole): AgentTemplate | undefined

// Get all custom agents
agentRegistry.getCustomAgents(): CustomAgent[]

// Add custom agent
await agentRegistry.addCustomAgent(agent: CustomAgent): Promise<void>

// Update custom agent
await agentRegistry.updateCustomAgent(id: string, updates: Partial<CustomAgent>): Promise<void>

// Delete custom agent
await agentRegistry.deleteCustomAgent(id: string): Promise<void>

// Import from Prompt Library
await agentRegistry.importFromPromptLibrary(promptIds?: string[]): Promise<number>

// Subscribe to changes
agentRegistry.subscribe(listener: () => void): () => void
```

### Parser Functions

```typescript
// Parse markdown file
parseAgentMarkdown(content: string, fileName?: string): CustomAgent

// Convert PromptFormData to agent
promptFormDataToAgent(prompt: PromptFormData): CustomAgent

// Export agent to markdown
exportAgentToMarkdown(agent: CustomAgent): string

// Validate agent
validateAgent(agent: Partial<CustomAgent>): {
  valid: boolean;
  errors: string[];
}
```

## Contributing

Have ideas for improving custom agents? Found a bug? Want to share your agent templates?

**GitHub Repository:** https://github.com/laryoshyn/Prompt-gen

**Contribute:**
1. Fork the repository
2. Add your agent templates to `example-agents/`
3. Update documentation if needed
4. Submit pull request

**Share Agents:**
- Open an issue with your agent file
- Tag with `agent-template` label
- Describe use case and benefits

---

## Quick Reference Card

### Minimal Valid Agent

```markdown
---
name: Simple Agent
description: Does something useful
---

# Simple Agent

You are {{role}}.

Task: {{task}}

Output: {{output}}
```

### Keyboard Shortcuts

None currently. All interactions via mouse/click.

### File Locations

- **Custom Agents Storage**: IndexedDB `custom-agents` store
- **Example Agents**: `/example-agents/*.md`
- **Documentation**: `/CUSTOM-AGENTS.md`

### Support

For questions or issues:
- Check this documentation first
- Review example agents in `/example-agents/`
- Check browser console for error details
- Open GitHub issue if problem persists

---

**Last Updated:** 2025-11-12
**Feature Version:** 1.0.0
**Compatible with:** Prompt-Gen v2.0+
