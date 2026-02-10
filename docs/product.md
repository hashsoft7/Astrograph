# Astrograph product overview

Astrograph is a lightweight, open-source static code analysis and visualization
tool for exploring large codebases. It helps developers understand structure,
trace execution paths, and debug statically by generating call graphs, symbol
maps, and entrypoint views across files and modules.

Astrograph is designed to feel modern, fast, and intuitive: a local, offline,
Sourcegraph-like experience focused on code comprehension rather than search.

## Project goals

- Make large codebases visually explorable
- Enable static debugging without running the code
- Be fast, lightweight, and responsive
- Provide a clean modern UI (not an IDE clone)
- Be Windows-first, but architected for cross-platform expansion
- Stay hackable and contributor-friendly

## Core concepts

Astrograph works by:

1. Parsing source code into ASTs
2. Extracting symbols (classes, functions, methods)
3. Resolving cross-file references
4. Building call graphs
5. Rendering relationships visually
6. Allowing users to annotate, bookmark, and label code entities

All analysis is static: no execution, no instrumentation, no runtime hooks.

## Key features (Windows v1)

### 1. Codebase analysis

- Scan a local repository or directory
- Respect `.gitignore`, `.ignore`, and optional `.astrographignore` patterns
- Incremental parsing (only re-analyze changed files)
- Language-aware parsing via Tree-sitter
- Support medium-to-large projects (10k+ files)

### 2. Symbol discovery

- Detect classes, structs, functions, methods, interfaces, traits, modules,
  namespaces
- Cross-file symbol resolution
- Fully-qualified symbol paths

### 3. Entrypoint detection

- Identify likely entrypoints:
  - main functions
  - exported APIs
  - framework-specific entrypoints (best-effort)
- Manual entrypoint marking
- Entrypoint-centric graph views

### 4. Call graph generation

- Function to function call relationships
- Method dispatch within classes
- Basic inheritance-aware resolution
- Multiple views:
  - Global call graph
  - Entrypoint-limited graph
  - Symbol-centric graph

### 5. Visual graph UI

- Interactive node-link graphs
- Zoom, pan, filter
- Expand or collapse subgraphs
- Highlight call paths
- Search symbols by name

### 6. Bookmarking and labeling

- Bookmark functions, classes, and files
- Add custom labels (for example: hot path, legacy, needs refactor)
- Persist bookmarks locally
- Quick navigation panel

### 7. Code navigation

- Jump from graph node to source file
- Inline preview of symbol definition
- File tree navigation

## Architecture overview

High-level design:

```
+--------------+
| UI (TS)      |
| React + UI   |
+------+-------+
       | IPC (JSON)
+------v-------+
| Rust Engine  |
| Analyzer     |
+------+-------+
       |
+------v-------+
| Tree-sitter  |
| Parsers      |
+--------------+
```

## Rust core (analysis engine)

### Responsibilities

- File scanning
- AST parsing
- Symbol extraction
- Call graph generation
- Caching and incremental updates
- Serialization of analysis results

### Technical requirements

- Rust stable
- Multi-threaded analysis
- Tree-sitter integration
- Deterministic output
- Low memory overhead

### Output format

- JSON or binary (future)
- Clearly versioned schema
- Optimized for UI consumption

## Frontend (TypeScript)

### Responsibilities

- Project management UI
- Graph rendering
- User interactions
- Bookmarks and labels
- Settings and preferences

### Stack

- TypeScript
- React
- State management (Zustand or equivalent)
- Graph rendering: Cytoscape.js or D3.js
- Virtualized lists for large datasets

### UX principles

- Minimal clicks
- Keyboard-friendly
- Dark-mode first
- No IDE clutter

## Desktop shell (Tauri)

### Why Tauri

- Lightweight compared to Electron
- Native Rust integration
- Fast startup
- Small binary size

### Responsibilities

- File system access
- IPC between Rust and UI
- Window management
- OS integration

## Platform support (v1)

### Officially supported

- Windows 10+
- x64 architecture

### Non-goals (v1)

- macOS support
- Linux support
- Mobile platforms

Architecture must remain portable to enable future expansion.

## Performance targets

- Startup time: under 1s (cold)
- Initial scan (medium repo): under 10s
- Incremental re-analysis: under 500ms
- UI remains responsive during analysis

## Non-goals (explicit)

To keep scope sane, Astrograph v1 will not:

- Execute code
- Provide runtime debugging
- Replace IDEs
- Offer full semantic correctness (best-effort static analysis)
- Compete with full language servers

## Future extensions (post-v1)

- VS Code extension (shared TS code)
- LSP-compatible backend
- Plugin system for languages
- macOS and Linux builds
- Web-based viewer
- Export graphs (SVG or JSON)
- Collaboration and sharing

## Open source principles

- MIT or Apache-2.0 license
- Clear contribution guidelines
- Modular architecture
- Well-documented internals
- Strong separation between UI and analysis core

## Ideal contributors

- Rust engineers (analysis engine)
- TypeScript and React devs (UI)
- Static analysis enthusiasts
- Tooling and compiler nerds
- OSS documentation writers

## Repository layout

```
crates/
  astrograph-engine/   Rust analysis engine
  astrograph-cli/      CLI wrapper for analysis
apps/
  astrograph-ui/       React UI for graphs and bookmarks
docs/
  schema.md            JSON schema reference
examples/
  sample-project/      Tiny demo input
  sample-output.json   Example analyzer output
```
