use astrograph_engine::{analyze_project, AnalysisConfig};
use serde::Serialize;
use std::fs;
use std::io::ErrorKind;
use std::path::PathBuf;
use std::process::Command;
use tauri::{Emitter, Manager};

#[derive(Debug, Serialize)]
#[serde(tag = "code")]
pub enum AnalyzeErrorPayload {
    #[serde(rename = "invalid_path")]
    InvalidPath { message: String },
    #[serde(rename = "not_directory")]
    NotDirectory { message: String },
    #[serde(rename = "io_error")]
    IoError { message: String },
    #[serde(rename = "analysis_failed")]
    AnalysisFailed { message: String },
}

const ANALYSIS_PROGRESS_EVENT: &str = "analysis-progress";

#[tauri::command]
fn analyze_project_dir(
    window: tauri::Window,
    path: String,
) -> Result<astrograph_engine::AnalysisResult, AnalyzeErrorPayload> {
    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Err(AnalyzeErrorPayload::InvalidPath {
            message: "Selected path does not exist.".to_string(),
        });
    }
    if !path_buf.is_dir() {
        return Err(AnalyzeErrorPayload::NotDirectory {
            message: "Please select a directory, not a file.".to_string(),
        });
    }

    let config = AnalysisConfig::new(path_buf);
    let app = window.app_handle().clone();
    let progress = Some(move |event: astrograph_engine::ProgressEvent| {
        let _ = app.emit(ANALYSIS_PROGRESS_EVENT, &event);
    });

    let output = analyze_project(config, None, progress).map_err(|err| {
        if let Some(io_err) = err.downcast_ref::<std::io::Error>() {
            if io_err.kind() == ErrorKind::PermissionDenied {
                log::error!("I/O permission error during analysis: {err:?}");
                return AnalyzeErrorPayload::IoError {
                    message: "Could not read files from the selected directory. Check permissions."
                        .to_string(),
                };
            }
        }

        log::error!("Analysis failed: {err:?}");
        AnalyzeErrorPayload::AnalysisFailed {
            message: "Analysis failed unexpectedly. See logs for details.".to_string(),
        }
    })?;

    Ok(output.result)
}

#[derive(Debug, Serialize)]
#[serde(tag = "code")]
pub enum ReadFileErrorPayload {
    #[serde(rename = "file_not_found")]
    FileNotFound { message: String },
    #[serde(rename = "io_error")]
    IoError { message: String },
    #[serde(rename = "invalid_path")]
    InvalidPath { message: String },
}

#[tauri::command]
fn read_file_content(root_path: String, file_path: String) -> Result<String, ReadFileErrorPayload> {
    let root = PathBuf::from(&root_path);
    if !root.exists() {
        return Err(ReadFileErrorPayload::InvalidPath {
            message: "Root path does not exist.".to_string(),
        });
    }

    let file = root.join(&file_path);

    // Security: Ensure the file path is within the root directory
    if !file.starts_with(&root) {
        return Err(ReadFileErrorPayload::InvalidPath {
            message: "File path is outside the project root.".to_string(),
        });
    }

    if !file.exists() {
        return Err(ReadFileErrorPayload::FileNotFound {
            message: format!("File not found: {}", file_path),
        });
    }

    if !file.is_file() {
        return Err(ReadFileErrorPayload::InvalidPath {
            message: format!("Path is not a file: {}", file_path),
        });
    }

    fs::read_to_string(&file).map_err(|err| {
        if err.kind() == ErrorKind::NotFound {
            ReadFileErrorPayload::FileNotFound {
                message: format!("File not found: {}", file_path),
            }
        } else if err.kind() == ErrorKind::PermissionDenied {
            ReadFileErrorPayload::IoError {
                message: format!("Permission denied reading file: {}", file_path),
            }
        } else {
            ReadFileErrorPayload::IoError {
                message: format!("Error reading file: {}", err),
            }
        }
    })
}

#[derive(Debug, Serialize)]
#[serde(tag = "code")]
pub enum OpenFileErrorPayload {
    #[serde(rename = "file_not_found")]
    FileNotFound { message: String },
    #[serde(rename = "io_error")]
    IoError { message: String },
    #[serde(rename = "invalid_path")]
    InvalidPath { message: String },
}

#[tauri::command]
fn open_file_in_editor(
    root_path: String,
    file_path: String,
    _line: Option<usize>,
) -> Result<(), OpenFileErrorPayload> {
    let root = PathBuf::from(&root_path);
    if !root.exists() {
        return Err(OpenFileErrorPayload::InvalidPath {
            message: "Root path does not exist.".to_string(),
        });
    }

    let file = root.join(&file_path);

    // Security: Ensure the file path is within the root directory
    if !file.starts_with(&root) {
        return Err(OpenFileErrorPayload::InvalidPath {
            message: "File path is outside the project root.".to_string(),
        });
    }

    if !file.exists() {
        return Err(OpenFileErrorPayload::FileNotFound {
            message: format!("File not found: {}", file_path),
        });
    }

    if !file.is_file() {
        return Err(OpenFileErrorPayload::InvalidPath {
            message: format!("Path is not a file: {}", file_path),
        });
    }

    // Open file with OS default application
    // Note: Line numbers are not universally supported by all editors via command line
    let result = if cfg!(target_os = "windows") {
        // Windows: use 'start' command
        Command::new("cmd")
            .args(["/C", "start", "", &file.to_string_lossy()])
            .spawn()
    } else if cfg!(target_os = "macos") {
        // macOS: use 'open' command
        Command::new("open").arg(&*file.to_string_lossy()).spawn()
    } else {
        // Linux: use 'xdg-open'
        Command::new("xdg-open")
            .arg(&*file.to_string_lossy())
            .spawn()
    };

    result.map_err(|err| OpenFileErrorPayload::IoError {
        message: format!("Failed to open file: {}", err),
    })?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            analyze_project_dir,
            read_file_content,
            open_file_in_editor
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
