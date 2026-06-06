mod commands;
mod db;
mod utils;

use db::Database;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let app_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data dir");
            let database =
                Database::new(app_dir).expect("Failed to initialize database");
            app.manage(database);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::cleaner::scan_temp_files,
            commands::cleaner::clean_selected_files,
            commands::health::get_system_health,
            commands::health::get_temperatures,
            commands::health::get_smart_data,
            commands::health::get_battery_health,
            commands::startup::get_startup_items,
            commands::startup::toggle_startup_item,
            commands::startup::get_boot_times,
            commands::services::get_services,
            commands::services::set_service_start_type,
            commands::network::get_network_status,
            commands::network::set_dns,
            commands::network::toggle_ipv6,
            commands::network::toggle_nagle,
            commands::network::ping_servers,
            commands::history::get_scan_history,
            commands::history::get_change_log,
            commands::history::get_pending_changes,
            commands::history::get_restore_points,
            commands::history::revert_change,
            commands::history::create_restore_point,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
