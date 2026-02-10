use astrograph_engine::{analyze_project, AnalysisConfig};
use serde::Serialize;
use std::io::ErrorKind;
use std::path::PathBuf;

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

#[tauri::command]
fn analyze_project_dir(
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

    let output = analyze_project(config, None).map_err(|err| {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![analyze_project_dir])
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
