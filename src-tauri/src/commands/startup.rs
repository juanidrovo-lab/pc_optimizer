use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct StartupItem {
    pub name: String,
    pub path: String,
    pub enabled: bool,
    pub impact: String,
}

#[tauri::command]
pub async fn get_startup_items() -> Result<Vec<StartupItem>, String> {
    // Will be implemented in step 5
    Ok(vec![])
}

#[tauri::command]
pub async fn toggle_startup_item(name: String, enable: bool) -> Result<(), String> {
    let _ = (name, enable);
    Ok(())
}
