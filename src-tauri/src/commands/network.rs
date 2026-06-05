use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct NetworkStatus {
    pub ipv6_enabled: bool,
    pub nagle_enabled: bool,
    pub current_dns: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct PingResult {
    pub server: String,
    pub region: String,
    pub latency_ms: Option<f64>,
}

#[tauri::command]
pub async fn get_network_status() -> Result<NetworkStatus, String> {
    // Will be implemented in step 5
    Ok(NetworkStatus {
        ipv6_enabled: true,
        nagle_enabled: true,
        current_dns: vec![],
    })
}

#[tauri::command]
pub async fn ping_servers() -> Result<Vec<PingResult>, String> {
    // Will be implemented in step 5
    Ok(vec![])
}
