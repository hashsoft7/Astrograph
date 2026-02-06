use astrograph_engine::{analyze_project, AnalysisConfig};
use std::path::PathBuf;

#[tauri::command]
fn analyze_project_dir(path: String) -> Result<astrograph_engine::AnalysisResult, String> {
    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Err(format!("Path does not exist: {}", path));
    }
    if !path_buf.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    let config = AnalysisConfig::new(path_buf);
    let output = analyze_project(config, None).map_err(|e| e.to_string())?;
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
