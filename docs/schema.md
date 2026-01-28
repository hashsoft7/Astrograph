# Astrograph Analysis Schema

Version: `0.1.0`

Astrograph emits a JSON payload optimized for UI consumption. The schema is
stable and deterministic for a given input + cache state.

## Top-Level Shape

```json
{
  "schema_version": "0.1.0",
  "root": "/absolute/path/to/root",
  "generated_at": "2026-01-28T10:11:12Z",
  "stats": {
    "file_count": 0,
    "symbol_count": 0,
    "call_count": 0,
    "entrypoint_count": 0,
    "reused_cache_files": 0,
    "reanalyzed_files": 0
  },
  "files": [],
  "symbols": [],
  "calls": [],
  "entrypoints": []
}
```

## Files

```json
{
  "path": "src/main.rs",
  "language": "rust",
  "hash": "sha256-hex",
  "byte_size": 1234
}
```

## Symbols

```json
{
  "id": "stable-id",
  "name": "analyze",
  "kind": "function",
  "file": "src/lib.rs",
  "span": {
    "start_line": 10,
    "start_col": 1,
    "end_line": 20,
    "end_col": 2
  },
  "fq_name": "src::lib::analyze",
  "container": "Analyzer",
  "is_exported": true,
  "is_entrypoint": false
}
```

## Calls

```json
{
  "id": "stable-id",
  "caller_id": "symbol-id",
  "callee_name": "parse",
  "callee_id": "symbol-id-or-null",
  "file": "src/lib.rs",
  "span": {
    "start_line": 12,
    "start_col": 4,
    "end_line": 12,
    "end_col": 19
  }
}
```

## Entrypoints

`entrypoints` is a list of symbol IDs marked as entrypoints. A symbol is
considered an entrypoint if it is named `main`, exported, or manually tagged
via the CLI.
