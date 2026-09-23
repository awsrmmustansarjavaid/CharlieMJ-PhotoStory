// Charlie MJ PhotoStory - desktop shell
// This just hosts the same offline web app (in /web) inside a native window
// using the system WebView2 runtime. No network calls, no telemetry.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Charlie MJ PhotoStory");
}
