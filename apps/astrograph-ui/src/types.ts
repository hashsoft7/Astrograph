export type Language = "rust" | "javascript" | "typescript" | "tsx";

export type SymbolKind =
  | "class"
  | "struct"
  | "enum"
  | "interface"
  | "trait"
  | "module"
  | "namespace"
  | "function"
  | "method";

export interface Span {
  start_line: number;
  start_col: number;
  end_line: number;
  end_col: number;
}

export interface FileInfo {
  path: string;
  language: Language;
  hash: string;
  byte_size: number;
}

export interface Symbol {
  id: string;
  name: string;
  kind: SymbolKind;
  file: string;
  span: Span;
  fq_name: string;
  container?: string | null;
  is_exported: boolean;
  is_entrypoint: boolean;
}

export interface CallEdge {
  id: string;
  caller_id: string;
  callee_name: string;
  callee_id?: string | null;
  file: string;
  span: Span;
}

export interface AnalysisStats {
  file_count: number;
  symbol_count: number;
  call_count: number;
  entrypoint_count: number;
  reused_cache_files: number;
  reanalyzed_files: number;
}

export interface AnalysisResult {
  schema_version: string;
  root: string;
  generated_at: string;
  stats: AnalysisStats;
  files: FileInfo[];
  symbols: Symbol[];
  calls: CallEdge[];
  entrypoints: string[];
}

export interface Bookmark {
  id: string;
  label?: string;
}
