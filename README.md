# Tangent Notebooks

A (mostly, sorry) vibe coded javascript notebook, featuring a modern sober interface, supporting data viz, on the web but local-first with a tauri app, with a Zed/deno -style notebook format in pure JavaScript.

## Start

### Prerequisites

- Node.js 18+
- Rust (for desktop app only)

### Installation

```bash
# Clone the repository
git clone https://github.com/tangent-to/tangent-notebook.git
cd notebook

# Install dependencies
npm install
```

### Running

**Web Version:**
```bash
npm run dev
# then head to http://localhost:5173
```

**Desktop App (Tauri):**
Make sure you have Rust and Cargo installed.

```bash
npm run tauri:dev
```

**Build for Production:**

```bash
# Web version
npm run build

# Desktop app
npm run tauri:build
```

## Usage

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open Command Palette |
| `Ctrl/Cmd + /` | Toggle AI Chat |
| `Ctrl/Cmd + S` | Save Notebook |
| `Ctrl/Cmd + N` | New Notebook |
| `Ctrl/Cmd + O` | Open Notebook |
| `Ctrl/Cmd + Enter` | Run Current Cell |
| `Shift + Enter` | Run Cell and Select Next |
| `Alt + Enter` | Run Cell and Insert Below |

### AI Setup

Not thouroughly tested...

1. **Claude API**:
   - Configure in AI settings with your Anthropic API key

2. **Ollama (Local)**:
   - Install from https://ollama.ai
   - Run `ollama pull codellama`
   - No API key needed!

### Examples

Head to notebook.tangent.to

## Tech stack

- **Frontend**. Svelte, TypeScript, Tailwind CSS
- **Build Tool**. Vite
- **Editor**. Monaco Editor
- **Desktop**. Tauri (Rust)
- **Viz Libraries**. Observable Plot, Plotly, D3.js, Vega-Lite, Arquero

## File Format

Notebooks use a git-friendly text format (`.js` extension):

```javascript
// ---
// title: My Notebook
// id: notebook-12345
// ---

// %% [markdown]
/*
# Welcome to Tangent Notebooks
*/

// %% [javascript]
const data = [1, 2, 3, 4, 5];
console.log(data);
```

See [NOTEBOOK_FORMAT.md](NOTEBOOK_FORMAT.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.
