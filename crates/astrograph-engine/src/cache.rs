use crate::model::{CallEdge, Language, ParsedFile, Symbol};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisCache {
    pub schema_version: String,
    pub root: String,
    pub files: HashMap<String, CachedFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedFile {
    pub hash: String,
    pub language: Language,
    pub symbols: Vec<Symbol>,
    pub calls: Vec<CallEdge>,
}

impl AnalysisCache {
    pub fn new(schema_version: &str, root: &str) -> Self {
        Self {
            schema_version: schema_version.to_string(),
            root: root.to_string(),
            files: HashMap::new(),
        }
    }

    pub fn upsert(&mut self, path: String, hash: String, language: Language, parsed: ParsedFile) {
        self.files.insert(
            path,
            CachedFile {
                hash,
                language,
                symbols: parsed.symbols,
                calls: parsed.calls,
            },
        );
    }
}
