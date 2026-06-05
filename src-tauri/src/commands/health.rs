use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct SystemHealth {
    pub cpu_usage: f64,
    pub ram_total_mb: u64,
    pub ram_used_mb: u64,
    pub disk_total_gb: f64,
    pub disk_used_gb: f64,
    pub uptime_seconds: u64,
}

#[tauri::command]
pub async fn get_system_health() -> Result<SystemHealth, String> {
    // Will be implemented in step 4 — real-time system metrics
    Ok(SystemHealth {
        cpu_usage: 0.0,
        ram_total_mb: 0,
        ram_used_mb: 0,
        disk_total_gb: 0.0,
        disk_used_gb: 0.0,
        uptime_seconds: 0,
    })
}
