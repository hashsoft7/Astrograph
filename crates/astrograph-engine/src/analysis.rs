use crate::cache::AnalysisCache;
use crate::language::{detect_language, supported_extensions};
use crate::model::{AnalysisResult, AnalysisStats, CallEdge, FileInfo, ParsedFile, Symbol};
use crate::parser::analyze_file;
use anyhow::{anyhow, Result};
use ignore::{DirEntry, WalkBuilder};
use rayon::prelude::*;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use time::format_description::well_known::Rfc3339;
use time::OffsetDateTime;

/// Progress event emitted during analysis for UI feedback.
#[derive(Debug, Clone, Serialize)]
pub struct ProgressEvent {
    pub phase: String,
    pub current_file: String,
    pub processed: u32,
    pub total: u32,
}

const SCHEMA_VERSION: &str = "0.1.0";

#[derive(Debug, Clone)]
pub struct AnalysisConfig {
    pub root: PathBuf,
    pub follow_symlinks: bool,
    pub manual_entrypoints: Vec<String>,
}

impl AnalysisConfig {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self {
            root: root.into(),
            follow_symlinks: false,
            manual_entrypoints: Vec::new(),
        }
    }
}

#[derive(Debug)]
pub struct AnalysisOutput {
    pub result: AnalysisResult,
    pub cache: AnalysisCache,
}

pub fn analyze_project<F>(
    config: AnalysisConfig,
    cache: Option<AnalysisCache>,
    progress: Option<F>,
) -> Result<AnalysisOutput>
where
    F: Fn(ProgressEvent),
{
    let root = config.root.canonicalize()?;
    let root_string = root.to_string_lossy().to_string();

    let mut cache = cache.unwrap_or_else(|| AnalysisCache::new(SCHEMA_VERSION, &root_string));
    let cached_files = cache.files.clone();

    let files = collect_files(&root, config.follow_symlinks, progress.as_ref())?;
    let total_files = files.len() as u32;
    let files_set: HashSet<String> = files
        .iter()
        .filter_map(|path| path.strip_prefix(&root).ok())
        .map(|path| path.to_string_lossy().to_string())
        .collect();

    let file_outcomes: Vec<FileOutcome> = if let Some(ref progress_fn) = progress {
        let mut outcomes = Vec::with_capacity(files.len());
        for (i, path) in files.iter().enumerate() {
            let relative = path
                .strip_prefix(&root)
                .unwrap_or(path)
                .to_string_lossy()
                .replace('\\', "/");
            progress_fn(ProgressEvent {
                phase: "analyzing".to_string(),
                current_file: relative.clone(),
                processed: i as u32,
                total: total_files,
            });
            let outcome = analyze_path(path, &root, &cached_files)?;
            outcomes.push(outcome);
        }
        outcomes
    } else {
        files
            .par_iter()
            .map(|path| analyze_path(path, &root, &cached_files))
            .collect::<Result<Vec<_>>>()?
    };

    let mut file_infos = Vec::new();
    let mut symbols = Vec::new();
    let mut calls = Vec::new();
    let mut reused_cache_files = 0;
    let mut reanalyzed_files = 0;

    for outcome in file_outcomes {
        if outcome.from_cache {
            reused_cache_files += 1;
        } else {
            reanalyzed_files += 1;
        }

        file_infos.push(FileInfo {
            path: outcome.path.clone(),
            language: outcome.language,
            hash: outcome.hash.clone(),
            byte_size: outcome.byte_size,
        });

        symbols.extend(outcome.parsed.symbols.clone());
        calls.extend(outcome.parsed.calls.clone());

        cache.upsert(outcome.path, outcome.hash, outcome.language, outcome.parsed);
    }

    cache.files.retain(|path, _| files_set.contains(path));

    resolve_calls(&mut calls, &symbols);
    apply_manual_entrypoints(&mut symbols, &config.manual_entrypoints);

    let mut entrypoints: Vec<String> = symbols
        .iter()
        .filter(|symbol| symbol.is_entrypoint)
        .map(|symbol| symbol.id.clone())
        .collect();
    entrypoints.sort();
    entrypoints.dedup();

    symbols.sort_by(|a, b| a.fq_name.cmp(&b.fq_name).then(a.id.cmp(&b.id)));
    calls.sort_by(|a, b| {
        a.caller_id
            .cmp(&b.caller_id)
            .then(a.callee_name.cmp(&b.callee_name))
            .then(a.id.cmp(&b.id))
    });
    file_infos.sort_by(|a, b| a.path.cmp(&b.path));

    let generated_at = OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .unwrap_or_else(|_| "unknown".to_string());

    let stats = AnalysisStats {
        file_count: file_infos.len(),
        symbol_count: symbols.len(),
        call_count: calls.len(),
        entrypoint_count: entrypoints.len(),
        reused_cache_files,
        reanalyzed_files,
    };

    let result = AnalysisResult {
        schema_version: SCHEMA_VERSION.to_string(),
        root: root_string,
        generated_at,
        stats,
        files: file_infos,
        symbols,
        calls,
        entrypoints,
    };

    Ok(AnalysisOutput { result, cache })
}

#[derive(Debug)]
struct FileOutcome {
    path: String,
    language: crate::model::Language,
    hash: String,
    byte_size: usize,
    parsed: ParsedFile,
    from_cache: bool,
}

fn analyze_path(
    path: &Path,
    root: &Path,
    cache_files: &HashMap<String, crate::cache::CachedFile>,
) -> Result<FileOutcome> {
    let language = detect_language(path).ok_or_else(|| anyhow!("Unsupported file"))?;
    let bytes = fs::read(path)?;
    let hash = hash_bytes(&bytes);
    let byte_size = bytes.len();
    let relative_path = path
        .strip_prefix(root)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/");

    if let Some(cached) = cache_files.get(&relative_path) {
        if cached.hash == hash && cached.language == language {
            return Ok(FileOutcome {
                path: relative_path,
                language,
                hash,
                byte_size,
                parsed: ParsedFile {
                    symbols: cached.symbols.clone(),
                    calls: cached.calls.clone(),
                },
                from_cache: true,
            });
        }
    }

    let parsed = analyze_file(path, root, language)?;
    Ok(FileOutcome {
        path: relative_path,
        language,
        hash,
        byte_size,
        parsed,
        from_cache: false,
    })
}

fn resolve_calls(calls: &mut [CallEdge], symbols: &[Symbol]) {
    let mut by_name: HashMap<String, Vec<&Symbol>> = HashMap::new();
    let mut by_fq: HashMap<String, Vec<&Symbol>> = HashMap::new();

    for symbol in symbols {
        by_name.entry(symbol.name.clone()).or_default().push(symbol);
        by_fq
            .entry(symbol.fq_name.clone())
            .or_default()
            .push(symbol);
    }

    for call in calls {
        let callee_name = call.callee_name.clone();
        let mut candidates = Vec::new();

        if callee_name.contains("::") || callee_name.contains('.') {
            if let Some(list) = by_fq.get(&callee_name) {
                candidates.extend(list.iter().cloned());
            }
            let short = split_last_segment(&callee_name);
            if let Some(list) = by_name.get(short) {
                candidates.extend(list.iter().cloned());
            }
        } else if let Some(list) = by_name.get(&callee_name) {
            candidates.extend(list.iter().cloned());
        }

        if !candidates.is_empty() {
            candidates.sort_by(|a, b| a.fq_name.cmp(&b.fq_name).then(a.id.cmp(&b.id)));
            call.callee_id = Some(candidates[0].id.clone());
        }
    }
}

fn split_last_segment(value: &str) -> &str {
    value
        .rsplit(|c| c == ':' || c == '.')
        .next()
        .unwrap_or(value)
}

fn apply_manual_entrypoints(symbols: &mut [Symbol], manual_entrypoints: &[String]) {
    if manual_entrypoints.is_empty() {
        return;
    }

    let manual: HashSet<&str> = manual_entrypoints.iter().map(String::as_str).collect();
    for symbol in symbols {
        if manual.contains(symbol.name.as_str()) || manual.contains(symbol.fq_name.as_str()) {
            symbol.is_entrypoint = true;
        }
    }
}

fn collect_files<F>(
    root: &Path,
    follow_symlinks: bool,
    progress: Option<&F>,
) -> Result<Vec<PathBuf>>
where
    F: Fn(ProgressEvent),
{
    let mut files = Vec::new();
    let supported = supported_extensions();

    let mut builder = WalkBuilder::new(root);
    builder.follow_links(follow_symlinks);
    builder.git_ignore(true).git_global(true).git_exclude(true);
    builder.add_custom_ignore_filename(".astrographignore");
    builder.filter_entry(|entry| !is_ignored(entry));

    for entry in builder.build() {
        let entry = entry?;
        let file_type = entry
            .file_type()
            .ok_or_else(|| anyhow!("Missing file type for entry"))?;
        if !file_type.is_file() {
            continue;
        }
        let path = entry.path();
        let ext = path
            .extension()
            .map(|ext: &std::ffi::OsStr| ext.to_string_lossy().to_ascii_lowercase());
        if let Some(ext) = ext {
            if supported.contains(&ext.as_str()) {
                let path_buf = path.to_path_buf();
                if let Some(progress_fn) = progress {
                    let relative = path_buf
                        .strip_prefix(root)
                        .unwrap_or(&path_buf)
                        .to_string_lossy()
                        .replace('\\', "/");
                    progress_fn(ProgressEvent {
                        phase: "collecting".to_string(),
                        current_file: relative,
                        processed: files.len() as u32,
                        total: 0,
                    });
                }
                files.push(path_buf);
            }
        }
    }

    Ok(files)
}

fn is_ignored(entry: &DirEntry) -> bool {
    if let Some(name) = entry.file_name().to_str() {
        let is_dir = entry.file_type().map(|ft| ft.is_dir()).unwrap_or(false);
        let ignored = [
            ".git",
            "target",
            "node_modules",
            "dist",
            "build",
            ".turbo",
            ".idea",
            ".vscode",
            ".cargo",
        ];
        if is_dir && ignored.contains(&name) {
            return true;
        }
        if is_dir && name.starts_with('.') && name != ".github" {
            return true;
        }
    }
    false
}

fn hash_bytes(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hex::encode(hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn analyze_empty_directory_produces_valid_output() {
        let temp_dir = std::env::temp_dir().join("astrograph_empty_test");
        let _ = fs::remove_dir_all(&temp_dir);
        fs::create_dir_all(&temp_dir).unwrap();

        let config = AnalysisConfig::new(&temp_dir);
        let output = analyze_project(config, None, None::<fn(ProgressEvent)>).unwrap();

        assert_eq!(output.result.stats.file_count, 0);
        assert_eq!(output.result.stats.symbol_count, 0);
        assert_eq!(output.result.stats.call_count, 0);
        assert_eq!(output.result.stats.entrypoint_count, 0);
        assert!(output.result.entrypoints.is_empty());
        assert!(output.result.files.is_empty());
        assert!(output.result.symbols.is_empty());
        assert!(output.result.calls.is_empty());

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
