use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum Language {
    Rust,
    JavaScript,
    TypeScript,
    Tsx,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub schema_version: String,
    pub root: String,
    pub generated_at: String,
    pub stats: AnalysisStats,
    pub files: Vec<FileInfo>,
    pub symbols: Vec<Symbol>,
    pub calls: Vec<CallEdge>,
    pub entrypoints: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AnalysisStats {
    pub file_count: usize,
    pub symbol_count: usize,
    pub call_count: usize,
    pub entrypoint_count: usize,
    pub reused_cache_files: usize,
    pub reanalyzed_files: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub language: Language,
    pub hash: String,
    pub byte_size: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Span {
    pub start_line: usize,
    pub start_col: usize,
    pub end_line: usize,
    pub end_col: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SymbolKind {
    Class,
    Struct,
    Enum,
    Interface,
    Trait,
    Module,
    Namespace,
    Function,
    Method,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Symbol {
    pub id: String,
    pub name: String,
    pub kind: SymbolKind,
    pub file: String,
    pub span: Span,
    pub fq_name: String,
    pub container: Option<String>,
    pub is_exported: bool,
    pub is_entrypoint: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallEdge {
    pub id: String,
    pub caller_id: String,
    pub callee_name: String,
    pub callee_id: Option<String>,
    pub file: String,
    pub span: Span,
}

#[derive(Debug, Clone)]
pub struct ParsedFile {
    pub symbols: Vec<Symbol>,
    pub calls: Vec<CallEdge>,
}
