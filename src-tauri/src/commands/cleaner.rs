use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct CleanableItem {
    pub category: String,
    pub path: String,
    pub size_bytes: u64,
    pub description: String,
}

#[derive(Debug, Serialize)]
pub struct ScanResult {
    pub items: Vec<CleanableItem>,
    pub total_bytes: u64,
}

#[tauri::command]
pub async fn scan_temp_files() -> Result<ScanResult, String> {
    // Will be implemented in step 3 — scans TEMP dirs, caches, etc.
    Ok(ScanResult {
        items: vec![],
        total_bytes: 0,
    })
}

#[tauri::command]
pub async fn clean_selected_files(paths: Vec<String>) -> Result<u64, String> {
    // Will be implemented in step 3 — deletes selected files, returns bytes freed
    let _ = paths;
    Ok(0)
}
