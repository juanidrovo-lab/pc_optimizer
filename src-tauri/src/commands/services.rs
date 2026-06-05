use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ServiceInfo {
    pub name: String,
    pub display_name: String,
    pub description: String,
    pub status: String,
    pub start_type: String,
    pub classification: String,
}

#[tauri::command]
pub async fn get_services() -> Result<Vec<ServiceInfo>, String> {
    // Will be implemented in step 5
    Ok(vec![])
}

#[tauri::command]
pub async fn set_service_start_type(
    name: String,
    start_type: String,
) -> Result<(), String> {
    let _ = (name, start_type);
    Ok(())
}
