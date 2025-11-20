# Astrograph

**Astrograph** is a lightweight, open-source static code analysis and visualization tool for exploring large codebases. It helps developers understand structure, trace execution paths, and debug statically by generating call graphs, symbol maps, and entrypoint views.

A **local, offline, Sourcegraph-like experience** focused on code comprehension.

---

## Building

### Prerequisites

- **Rust** (stable toolchain)
- **Node.js** (v18+)
- **npm**

### Build the Analysis Engine

```bash
# Build the CLI tool
cargo build -p astrograph-cli --release

# The binary will be at target/release/astrograph-cli
```

### Build the UI

```bash
cd apps/astrograph-ui
npm install
npm run build
```

---

## Usage

### Step 1: Analyze a Project

Run the CLI to analyze your codebase and generate a JSON output:

```bash
cargo run -p astrograph-cli -- --root /path/to/repo --out analysis.json
```

**With caching** (for faster incremental re-analysis):

```bash
cargo run -p astrograph-cli -- --root /path/to/repo --out analysis.json --cache .astrograph-cache.json
```

### Step 2: Launch the UI

```bash
cd apps/astrograph-ui
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and load your `analysis.json` file.

### CLI Options

| Flag | Description |
|------|-------------|
| `--root` | Path to the repository or directory to analyze |
| `--out` | Output path for the analysis JSON |
| `--cache` | Cache file path for incremental analysis |
| `--entrypoint` | Manually mark entrypoints (can be repeated) |
| `--follow-symlinks` | Follow symlinks when scanning files |

---

## Features

- **Static Analysis** — Parse source code into ASTs and extract symbols (classes, functions, methods) without executing code
- **Call Graph Generation** — Visualize function-to-function relationships across files
- **Symbol Discovery** — Cross-file resolution with fully-qualified symbol paths
- **Entrypoint Detection** — Automatically identify `main` functions and exported APIs
- **Interactive Graph UI** — Zoom, pan, filter, expand/collapse subgraphs
- **Bookmarks & Labels** — Mark important symbols with custom labels for quick navigation

### Supported Languages

- Rust
- JavaScript
- TypeScript

---

## Architecture

```
┌──────────────┐
│   UI (TS)    │  React + Zustand
└──────┬───────┘
       │ JSON
┌──────▼───────┐
│ Rust Engine  │  Analysis + Caching
└──────┬───────┘
       │
┌──────▼───────┐
│ Tree-sitter  │  Parsing
└──────────────┘
```

---

## Repository Layout

```
crates/
  astrograph-engine/   Rust analysis engine
  astrograph-cli/      CLI wrapper
apps/
  astrograph-ui/       React UI
docs/
  schema.md            JSON schema reference
examples/
  sample-project/      Demo input
  sample-output.json   Example output
```

---

## Roadmap

**Current:** Windows-first with cross-platform architecture

**Planned:**
- macOS & Linux builds
- VS Code extension
- Web-based viewer
- Export graphs (SVG/JSON)
- Plugin system for additional languages

---

## Contributing

Contributions welcome! The project is modular with clear separation between the Rust analysis engine and the TypeScript UI.

**License:** MIT or Apache-2.0
