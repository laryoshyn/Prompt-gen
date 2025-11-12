# Prompt-Gen: Interactive Prompt Engineering Assistant

Production-grade prompt generation for Claude, GPT-4o, Gemini, and other LLMs.

## Components

### 📚 Knowledge Base
- **[PROMPT-GENERATION-GUIDE.md](./PROMPT-GENERATION-GUIDE.md)**: Comprehensive 2025 prompt engineering guide
  - Extended thinking & reflection patterns
  - Chain-of-Thought techniques
  - Claude 4.x model-specific behaviors
  - Modern agentic workflow patterns
  - Evaluation & measurement frameworks
  - Meta-prompt generator
- **[PURPOSE.md](./PURPOSE.md)**: Project vision and consultative approach
- **[CLAUDE.md](./CLAUDE.md)**: Developer guidance for future Claude Code instances
- **[PLAN.md](./PLAN.md)**: Detailed implementation plan for the web application

### 🚀 Web Application
Interactive prompt builder with split-view interface and visual workflow designer.

**Features:**
- **Split-View Interface**: Form on left, live Markdown preview on right
- **Real-Time Preview**: Monaco Editor (VS Code quality) with instant updates
- **Multi-Agent Workflow Builder**: Visual graph with React Flow (coming soon)
- **Auto-Save**: Hybrid storage (localStorage + IndexedDB)
- **Multiple Export Methods**:
  - Copy to clipboard
  - Download Markdown file
  - Generate ZIP with `.claude/commands/` structure
  - Direct write to `.claude/commands/` (File System Access API)

**Tech Stack:**
- React 18.3 + TypeScript
- Vite 6.0
- Zustand (state management)
- Tailwind CSS 4.0
- Monaco Editor
- React Flow (workflow graphs)

## Quick Start

### Run the Web App

```bash
cd app
npm install
npm run dev
```

Open http://localhost:3000

### Build for Production

```bash
cd app
npm run build
```

Output will be in `app/dist/`

## Project Structure

```
Prompt-gen/
├── app/                          # Frontend application
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── store/               # Zustand stores
│   │   ├── types/               # TypeScript definitions
│   │   └── lib/                 # Utilities & services
│   └── package.json
├── PROMPT-GENERATION-GUIDE.md    # Knowledge base
├── PURPOSE.md                    # Project vision
├── CLAUDE.md                     # Developer guide
├── PLAN.md                       # Implementation plan
└── README.md                     # This file
```

## Usage

1. **Open the web app** - Start the dev server or visit the deployed URL
2. **Fill the form** - Enter your prompt details (objective, domain, audience, etc.)
3. **See live preview** - Watch the markdown generate in real-time on the right
4. **Export** - Copy to clipboard or download as `.md` file for Claude Code

## Features

### Current (Phase 1 - MVP)
✅ Split-view layout with resizable panels
✅ Basic prompt form (model, objective, domain, thinking mode, etc.)
✅ Live Markdown preview with Monaco Editor
✅ Zustand stores for state management
✅ Auto-save to localStorage
✅ Copy to clipboard
✅ Download as Markdown file
✅ Tailwind CSS 4.0 styling

### Coming Soon
- 🔄 Complete form fields (constraints, examples, variables)
- 🔄 Visual workflow builder for multi-agent prompts (React Flow)
- 🔄 IndexedDB for prompt library
- 🔄 Template selector (import from guide)
- 🔄 ZIP export with `.claude/commands/` structure
- 🔄 File System Access API (direct write)
- 🔄 Advanced prompt generation engine
- 🔄 Variable interpolation ({{var|default="x"}})
- 🔄 Dark mode
- 🔄 Responsive design

## Development

### Prerequisites
- Node.js 20+
- npm 10+

### Install Dependencies
```bash
cd app
npm install
```

### Development Server
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Deployment

The app is a static site and can be deployed to:
- Netlify
- Vercel
- GitHub Pages
- Cloudflare Pages

See [PLAN.md](./PLAN.md) for detailed deployment instructions.

## Documentation

- **[PROMPT-GENERATION-GUIDE.md](./PROMPT-GENERATION-GUIDE.md)** - Complete 2025 prompt engineering guide
- **[PURPOSE.md](./PURPOSE.md)** - Why and how of interactive prompt generation
- **[CLAUDE.md](./CLAUDE.md)** - Architecture and developer guidance
- **[PLAN.md](./PLAN.md)** - Detailed implementation plan

## Contributing

This project is in active development. Phase 1 (MVP) is complete. See [PLAN.md](./PLAN.md) for the roadmap.

## License

MIT

---

**Built with Claude Code** 🤖
