pub mod commands;
pub mod image_processor;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::load_image,
            commands::clip_and_save,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
