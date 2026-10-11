// CharlieMJ PhotoStory v2 - desktop shell.
// Hosts the same offline web app (../../web) in a native WebView2 window and adds a few
// small native helpers: pick an export folder, write files there, reveal them in Explorer,
// and keep settings.json next to the .exe (portable). No network calls, no telemetry.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::{engine::general_purpose::STANDARD, Engine};
use std::path::PathBuf;

fn exe_dir() -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."))
}

#[tauri::command]
fn pick_folder() -> Option<String> {
    rfd::FileDialog::new()
        .pick_folder()
        .map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
fn save_file(folder: String, filename: String, data_base64: String) -> Result<String, String> {
    let bytes = STANDARD.decode(data_base64).map_err(|e| e.to_string())?;
    // keep only the file-name part so a crafted name can never escape the chosen folder
    let name = PathBuf::from(&filename)
        .file_name()
        .ok_or("invalid file name")?
        .to_owned();
    let dir = PathBuf::from(folder);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(name);
    std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn reveal_file(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(format!("/select,{}", path))
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open").args(["-R", &path]).spawn().map_err(|e| e.to_string())?;
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let dir = PathBuf::from(&path).parent().map(|p| p.to_path_buf()).unwrap_or_default();
        std::process::Command::new("xdg-open").arg(dir).spawn().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn read_settings() -> Option<String> {
    std::fs::read_to_string(exe_dir().join("settings.json")).ok()
}

#[tauri::command]
fn write_settings(json: String) -> Result<(), String> {
    std::fs::write(exe_dir().join("settings.json"), json).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            pick_folder,
            save_file,
            reveal_file,
            read_settings,
            write_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running CharlieMJ PhotoStory");
}
