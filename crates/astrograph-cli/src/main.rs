use anyhow::{Context, Result};
use astrograph_engine::{analyze_project, AnalysisCache, AnalysisConfig};
use clap::Parser;
use std::fs;
use std::path::PathBuf;
use std::process;

#[derive(Debug, Parser)]
#[command(
    name = "astrograph",
    version,
    about = "Static analysis CLI for Astrograph"
)]
struct Cli {
    /// Root directory of the repository to analyze.
    #[arg(long, default_value = ".")]
    root: PathBuf,

    /// Output JSON file path.
    #[arg(long, default_value = "analysis.json")]
    out: PathBuf,

    /// Optional cache file path for incremental analysis.
    #[arg(long)]
    cache: Option<PathBuf>,

    /// Mark entrypoints manually (repeatable).
    #[arg(long = "entrypoint")]
    entrypoints: Vec<String>,

    /// Follow symlinks while scanning.
    #[arg(long)]
    follow_symlinks: bool,
}

fn main() {
    if let Err(err) = run() {
        eprintln!("Error: {}", format_user_friendly_error(&err));
        process::exit(1);
    }
}

fn run() -> Result<()> {
    let cli = Cli::parse();

    println!("Analyzing {} ...", cli.root.display());

    let mut config = AnalysisConfig::new(&cli.root);
    config.follow_symlinks = cli.follow_symlinks;
    config.manual_entrypoints = cli.entrypoints;

    let cache = load_cache(cli.cache.as_ref())?;
    let output = analyze_project(config, cache)?;

    println!("Writing analysis to {} ...", cli.out.display());

    let json = serde_json::to_string_pretty(&output.result)?;
    fs::write(&cli.out, json).with_context(|| format!("Failed to write {}", cli.out.display()))?;

    if let Some(cache_path) = cli.cache {
        println!("Writing cache to {} ...", cache_path.display());

        let cache_json = serde_json::to_string_pretty(&output.cache)?;
        fs::write(&cache_path, cache_json)
            .with_context(|| format!("Failed to write {}", cache_path.display()))?;
    }

    println!("Astrograph analysis complete.");
    println!("Files: {}", output.result.stats.file_count);
    println!("Symbols: {}", output.result.stats.symbol_count);
    println!("Calls: {}", output.result.stats.call_count);
    println!("Entrypoints: {}", output.result.stats.entrypoint_count);

    Ok(())
}

fn load_cache(path: Option<&PathBuf>) -> Result<Option<AnalysisCache>> {
    let Some(path) = path else {
        return Ok(None);
    };
    if !path.exists() {
        return Ok(None);
    }
    let data =
        fs::read_to_string(path).with_context(|| format!("Failed to read {}", path.display()))?;
    let cache = serde_json::from_str(&data)?;
    Ok(Some(cache))
}

fn format_user_friendly_error(err: &anyhow::Error) -> String {
    if let Some(io_err) = err.downcast_ref::<std::io::Error>() {
        use std::io::ErrorKind;

        return match io_err.kind() {
            ErrorKind::NotFound => {
                "File or directory not found. Check the --root and output paths.".to_string()
            }
            ErrorKind::PermissionDenied => {
                "Permission denied when accessing files. Check your file permissions.".to_string()
            }
            _ => err.to_string(),
        };
    }

    // Fall back to the original error message for non-I/O errors.
    err.to_string()
}
