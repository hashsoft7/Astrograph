use astrograph_engine::{analyze_project, AnalysisConfig};
use std::fs;
use std::path::PathBuf;

fn workspace_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
}

fn write_file(path: &PathBuf, contents: &str) {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).unwrap();
    }
    fs::write(path, contents).unwrap();
}

#[test]
fn gitignore_excludes_ignored_directories() {
    let root = workspace_root().join("log/ignore_git_test");
    let _ = fs::remove_dir_all(&root);
    fs::create_dir_all(&root).unwrap();

    // .gitignore excludes the ignored directory.
    write_file(&root.join(".gitignore"), "ignored_dir/\nignored_ts/\n");

    // This file should be included.
    write_file(
        &root.join("included/main.ts"),
        "export function included() {}\n",
    );

    // These files should be ignored via .gitignore.
    write_file(
        &root.join("ignored_dir/ignored.ts"),
        "export function ignored() {}\n",
    );
    write_file(
        &root.join("ignored_ts/another.ts"),
        "export function ignored_ts() {}\n",
    );

    let config = AnalysisConfig::new(&root);
    let out = analyze_project(config, None).expect("analyze should succeed");

    let file_paths: Vec<&str> = out.result.files.iter().map(|f| f.path.as_str()).collect();

    assert!(
        file_paths.iter().any(|p| p.ends_with("included/main.ts")),
        "included file should be analyzed"
    );
    assert!(
        !file_paths
            .iter()
            .any(|p| p.contains("ignored_dir/ignored.ts")),
        "gitignored directory should not be analyzed"
    );
    assert!(
        !file_paths
            .iter()
            .any(|p| p.contains("ignored_ts/another.ts")),
        "gitignored directory should not be analyzed"
    );

    let _ = fs::remove_dir_all(&root);
}

#[test]
fn astrographignore_excludes_directories() {
    let root = workspace_root().join("log/ignore_astrograph_test");
    let _ = fs::remove_dir_all(&root);
    fs::create_dir_all(&root).unwrap();

    // Custom ignore file should be honored.
    write_file(&root.join(".astrographignore"), "ignored_dir/\n");

    write_file(
        &root.join("included/main.ts"),
        "export function included() {}\n",
    );
    write_file(
        &root.join("ignored_dir/ignored.ts"),
        "export function ignored() {}\n",
    );

    let config = AnalysisConfig::new(&root);
    let out = analyze_project(config, None).expect("analyze should succeed");

    let file_paths: Vec<&str> = out.result.files.iter().map(|f| f.path.as_str()).collect();

    assert!(
        file_paths.iter().any(|p| p.ends_with("included/main.ts")),
        "included file should be analyzed"
    );
    assert!(
        !file_paths
            .iter()
            .any(|p| p.contains("ignored_dir/ignored.ts")),
        "directory listed in .astrographignore should not be analyzed"
    );

    let _ = fs::remove_dir_all(&root);
}

#[test]
fn both_gitignore_and_astrographignore_are_honored() {
    let root = workspace_root().join("log/ignore_both_test");
    let _ = fs::remove_dir_all(&root);
    fs::create_dir_all(&root).unwrap();

    write_file(&root.join(".gitignore"), "gitignored_dir/\n");
    write_file(&root.join(".astrographignore"), "astroignored_dir/\n");

    write_file(
        &root.join("included/main.ts"),
        "export function included() {}\n",
    );
    write_file(
        &root.join("gitignored_dir/ignored.ts"),
        "export function gitignored() {}\n",
    );
    write_file(
        &root.join("astroignored_dir/ignored.ts"),
        "export function astroignored() {}\n",
    );

    let config = AnalysisConfig::new(&root);
    let out = analyze_project(config, None).expect("analyze should succeed");

    let file_paths: Vec<&str> = out.result.files.iter().map(|f| f.path.as_str()).collect();

    assert!(
        file_paths.iter().any(|p| p.ends_with("included/main.ts")),
        "included file should be analyzed"
    );
    assert!(
        !file_paths
            .iter()
            .any(|p| p.contains("gitignored_dir/ignored.ts")),
        ".gitignore rules should be applied"
    );
    assert!(
        !file_paths
            .iter()
            .any(|p| p.contains("astroignored_dir/ignored.ts")),
        ".astrographignore rules should be applied"
    );

    let _ = fs::remove_dir_all(&root);
}
