# Astrograph

**Astrograph** is a lightweight, open-source static code analysis and visualization tool for exploring large codebases.
It helps developers **understand structure, trace execution paths, and debug statically** by generating **call graphs, symbol maps, and entrypoint views** across files and modules.

Astrograph is designed to feel modern, fast, and intuitive — a **local, offline, Sourcegraph-like experience**, focused on code comprehension rather than search.

---

## 🎯 Project Goals

* Make large codebases **visually explorable**
* Enable **static debugging** without running the code
* Be **fast, lightweight, and responsive**
* Provide a **clean modern UI** (not an IDE clone)
* Be **Windows-first**, but architected for cross-platform expansion
* Stay **hackable and contributor-friendly**

---

## 🧠 Core Concepts

Astrograph works by:

1. Parsing source code into **ASTs**
2. Extracting **symbols** (classes, functions, methods)
3. Resolving **cross-file references**
4. Building **call graphs**
5. Rendering relationships visually
6. Allowing users to annotate, bookmark, and label code entities

All analysis is **static** — no execution, no instrumentation, no runtime hooks.

---

## 🧩 Key Features (Windows v1)

### 1. Codebase Analysis

* Scan a local repository or directory
* Incremental parsing (only re-analyze changed files)
* Language-aware parsing via **Tree-sitter**
* Support medium-to-large projects (10k+ files)

### 2. Symbol Discovery

* Detect:

  * Classes / structs
  * Functions / methods
  * Interfaces / traits
  * Modules / namespaces
* Cross-file symbol resolution
* Fully-qualified symbol paths

### 3. Entrypoint Detection

* Identify likely entrypoints:

  * `main` functions
  * exported APIs
  * framework-specific entrypoints (best-effort)
* Manual entrypoint marking
* Entry-point centric graph views

### 4. Call Graph Generation

* Function → function call relationships
* Method dispatch within classes
* Basic inheritance-aware resolution
* Multiple views:

  * Global call graph
  * Entrypoint-limited graph
  * Symbol-centric graph

### 5. Visual Graph UI

* Interactive node-link graphs
* Zoom, pan, filter
* Expand / collapse subgraphs
* Highlight call paths
* Search symbols by name

### 6. Bookmarking & Labeling

* Bookmark:

  * Functions
  * Classes
  * Files
* Add custom labels (e.g. “hot path”, “legacy”, “needs refactor”)
* Persist bookmarks locally
* Quick navigation panel

### 7. Code Navigation

* Jump from graph node → source file
* Inline preview of symbol definition
* File tree navigation

---

## 🧱 Architecture Overview

### High-Level Design

```
┌──────────────┐
│   UI (TS)    │
│  React + UI  │
└──────┬───────┘
       │ IPC (JSON)
┌──────▼───────┐
│ Rust Engine  │
│  Analyzer    │
└──────┬───────┘
       │
┌──────▼───────┐
│ Tree-sitter  │
│  Parsers     │
└──────────────┘
```

---

## 🦀 Rust Core (Analysis Engine)

### Responsibilities

* File scanning
* AST parsing
* Symbol extraction
* Call graph generation
* Caching & incremental updates
* Serialization of analysis results

### Technical Requirements

* Rust stable
* Multi-threaded analysis
* Tree-sitter integration
* Deterministic output
* Low memory overhead

### Output Format

* JSON or binary (future)
* Clearly versioned schema
* Optimized for UI consumption

---

## 🎨 Frontend (TypeScript)

### Responsibilities

* Project management UI
* Graph rendering
* User interactions
* Bookmarks & labels
* Settings & preferences

### Stack

* TypeScript
* React
* State management (Zustand or equivalent)
* Graph rendering:

  * Cytoscape.js or D3.js
* Virtualized lists for large datasets

### UX Principles

* Minimal clicks
* Keyboard-friendly
* Dark-mode first
* No IDE clutter

---

## 🧳 Desktop Shell (Tauri)

### Why Tauri

* Lightweight compared to Electron
* Native Rust integration
* Fast startup
* Small binary size

### Responsibilities

* File system access
* IPC between Rust and UI
* Window management
* OS integration

---

## 🪟 Platform Support (v1)

### Officially Supported

* Windows 10+
* x64 architecture

### Non-Goals (v1)

* macOS support
* Linux support
* Mobile platforms

> Architecture must remain portable to enable future expansion.

---

## 🧪 Performance Targets

* Startup time: < 1s (cold)
* Initial scan (medium repo): < 10s
* Incremental re-analysis: < 500ms
* UI remains responsive during analysis

---

## 📦 Non-Goals (Explicit)

To keep scope sane, Astrograph v1 **will not**:

* Execute code
* Provide runtime debugging
* Replace IDEs
* Offer full semantic correctness (best-effort static analysis)
* Compete with full language servers

---

## 🔌 Future Extensions (Post-v1)

* VS Code extension (shared TS code)
* LSP-compatible backend
* Plugin system for languages
* macOS & Linux builds
* Web-based viewer
* Export graphs (SVG / JSON)
* Collaboration & sharing

---

## 🤝 Open Source Principles

* MIT or Apache-2.0 license
* Clear contribution guidelines
* Modular architecture
* Well-documented internals
* Strong separation between UI and analysis core

---

## 📌 Ideal Contributors

* Rust engineers (analysis engine)
* TypeScript / React devs (UI)
* Static analysis enthusiasts
* Tooling & compiler nerds
* OSS documentation writers


Just tell me where to go next 🚀
