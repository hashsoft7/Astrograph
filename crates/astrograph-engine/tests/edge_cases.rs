// Integration tests for edge cases.

use astrograph_engine::{analyze_project, AnalysisConfig};
use std::fs;
use std::path::PathBuf;

fn workspace_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
}

#[test]
fn analyze_sample_project_succeeds() {
    let root = workspace_root().join("examples/sample-project");
    if !root.exists() {
        eprintln!("Skipping: sample-project not found");
        return;
    }
    let config = AnalysisConfig::new(&root);
    let out = analyze_project(config, None, None::<fn(astrograph_engine::ProgressEvent)>)
        .expect("analyze should succeed");
    assert!(out.result.stats.file_count >= 1);
    assert!(!out.result.symbols.is_empty());
}

#[test]
fn analyze_empty_dir_succeeds_with_zero_files() {
    let root = workspace_root().join("log/empty_dir_test");
    let _ = fs::remove_dir_all(&root);
    fs::create_dir_all(&root).unwrap();
    let config = AnalysisConfig::new(&root);
    let out = analyze_project(config, None, None::<fn(astrograph_engine::ProgressEvent)>)
        .expect("analyze should succeed");
    assert_eq!(out.result.stats.file_count, 0);
    assert!(out.result.symbols.is_empty());
    assert!(out.result.calls.is_empty());
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn manual_entrypoints_applied() {
    let root = workspace_root().join("examples/sample-project");
    if !root.exists() {
        eprintln!("Skipping: sample-project not found");
        return;
    }
    let mut config = AnalysisConfig::new(&root);
    config.manual_entrypoints = vec!["helper".to_string()];
    let out = analyze_project(config, None, None::<fn(astrograph_engine::ProgressEvent)>)
        .expect("analyze should succeed");
    let helper = out
        .result
        .symbols
        .iter()
        .find(|s| s.name == "helper")
        .expect("helper symbol exists");
    assert!(
        helper.is_entrypoint,
        "manual entrypoint should mark symbol as entrypoint"
    );
}
