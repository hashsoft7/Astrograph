# Contributing to Astrograph

Thank you for your interest in contributing to Astrograph. This document explains how to set up your environment, follow project conventions, and submit changes.

## Development Setup

### Prerequisites

- **Rust** (1.85+, with `rustfmt`). The project uses `rust-toolchain.toml`; run `rustup show` in the repo to confirm the correct toolchain.
- **Node.js** (20+) and npm for the UI app.
- **Tauri** (for desktop app): see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS (e.g. Windows: WebView2, Visual Studio build tools).

### Clone and build

```bash
git clone https://github.com/hashsoft7/Astrograph.git
cd Astrograph
```

- **Rust workspace**: from the repo root, `cargo build` builds all crates.
- **UI**: `cd apps/astrograph-ui && npm install && npm run dev` runs the web UI in development.
- **Desktop (Tauri)**: from `apps/astrograph-ui`, `npm run tauri:dev` runs the desktop app.

## Building

- **CLI**: `cargo build -p astrograph-cli --release`
- **Web UI**: `cd apps/astrograph-ui && npm run build` (output in `dist/`)
- **Desktop app**: from `apps/astrograph-ui`, `npm run tauri:build`

## Testing

### Rust

From the repository root:

```bash
cargo test --workspace --all-targets
```

Format is checked with:

```bash
cargo fmt --check
```

### UI (unit and E2E)

From `apps/astrograph-ui`:

```bash
npm ci
npm run test:run
```

E2E tests use Playwright. Install browsers once, then run:

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

CI runs these same steps (format check, Rust tests, UI unit tests, UI E2E with Chromium).

## Code Style

- **Rust**: use `cargo fmt` before committing. CI runs `cargo fmt --check`.
- **TypeScript/React**: follow existing patterns in `apps/astrograph-ui/src`. Run the project’s lint script if one is configured (e.g. `npm run lint`).

## Submitting Changes

1. Create a branch from `main` for your change.
2. Make small, focused commits with clear messages.
3. Ensure all tests pass and format checks succeed (see Testing and Code Style above).
4. Open a pull request against `main`. Describe what changed and why.
5. Address review feedback; CI must be green before merge.

## Reporting Issues

- Use the GitHub issue tracker for bugs and feature requests.
- Include steps to reproduce, expected vs actual behavior, and your environment (OS, Rust/Node versions) where relevant.

## Project Structure

- `crates/astrograph-engine` – static analysis engine (Rust).
- `crates/astrograph-cli` – CLI for running analysis and writing `analysis.json`.
- `apps/astrograph-ui` – React UI and Tauri desktop shell (`src-tauri/`).
- `docs/` – product overview (`product.md`) and schema (`schema.md`).

For more on goals and architecture, see `docs/product.md`.
