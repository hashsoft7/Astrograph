use crate::model::Language;
use std::path::Path;
use tree_sitter::Language as TsLanguage;

pub fn detect_language(path: &Path) -> Option<Language> {
    let ext = path.extension()?.to_string_lossy().to_ascii_lowercase();
    match ext.as_str() {
        "rs" => Some(Language::Rust),
        "js" | "cjs" | "mjs" => Some(Language::JavaScript),
        "ts" => Some(Language::TypeScript),
        "tsx" => Some(Language::Tsx),
        _ => None,
    }
}

pub fn supported_extensions() -> Vec<&'static str> {
    vec!["rs", "js", "cjs", "mjs", "ts", "tsx"]
}

pub fn tree_sitter_language(language: Language) -> TsLanguage {
    match language {
        Language::Rust => tree_sitter_rust::language(),
        Language::JavaScript => tree_sitter_javascript::language(),
        Language::TypeScript => tree_sitter_typescript::language_typescript(),
        Language::Tsx => tree_sitter_typescript::language_tsx(),
    }
}
