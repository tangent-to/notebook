use std::fs;
use tauri::Manager;

#[derive(serde::Serialize, serde::Deserialize)]
struct RecentFile {
    path: String,
    name: String,
    timestamp: u64,
}

#[tauri::command]
async fn read_notebook_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
async fn write_notebook_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content)
        .map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
async fn get_recent_files(app: tauri::AppHandle) -> Result<Vec<RecentFile>, String> {
    let app_dir = app.path().app_data_dir()
        .map_err(|_| "Failed to get app data directory")?;
    let recent_files_path = app_dir.join("recent_files.json");
    if !recent_files_path.exists() {
        return Ok(vec![]);
    }
    let content = fs::read_to_string(recent_files_path)
        .map_err(|e| format!("Failed to read recent files: {}", e))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse recent files: {}", e))
}

#[tauri::command]
async fn add_recent_file(
    app: tauri::AppHandle,
    path: String,
    name: String,
    timestamp: u64,
) -> Result<(), String> {
    let app_dir = app.path().app_data_dir()
        .map_err(|_| "Failed to get app data directory")?;
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Failed to create app directory: {}", e))?;
    }
    let recent_files_path = app_dir.join("recent_files.json");
    let mut recent_files = if recent_files_path.exists() {
        let content = fs::read_to_string(&recent_files_path)
            .map_err(|e| format!("Failed to read recent files: {}", e))?;
        serde_json::from_str::<Vec<RecentFile>>(&content).unwrap_or_default()
    } else {
        vec![]
    };
    recent_files.retain(|f| f.path != path);
    recent_files.insert(0, RecentFile { path, name, timestamp });
    recent_files.truncate(10);
    let content = serde_json::to_string(&recent_files)
        .map_err(|e| format!("Failed to serialize recent files: {}", e))?;
    fs::write(recent_files_path, content)
        .map_err(|e| format!("Failed to write recent files: {}", e))
}

#[tauri::command]
async fn get_default_save_directory(app: tauri::AppHandle) -> Result<String, String> {
    let documents_dir = app.path().document_dir()
        .map_err(|_| "Failed to get documents directory")?;
    let notebooks_dir = documents_dir.join("Tangent Notebooks");
    if !notebooks_dir.exists() {
        fs::create_dir_all(&notebooks_dir)
            .map_err(|e| format!("Failed to create notebooks directory: {}", e))?;
    }
    notebooks_dir
        .to_str()
        .map(|s: &str| s.to_string())
        .ok_or("Failed to convert path to string".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            read_notebook_file,
            write_notebook_file,
            get_recent_files,
            add_recent_file,
            get_default_save_directory,
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
