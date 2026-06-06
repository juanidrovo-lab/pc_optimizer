use crate::db::Database;
use crate::utils::powershell;
use serde::Serialize;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct ServiceInfo {
    pub name: String,
    pub display_name: String,
    pub description: String,
    pub status: String,
    pub start_type: String,
    pub classification: String,
    pub dependencies: Vec<String>,
}

const ESSENTIAL_SERVICES: &[&str] = &[
    "Dhcp",
    "Dnscache",
    "EventLog",
    "LanmanWorkstation",
    "MpsSvc",
    "RpcSs",
    "SamSs",
    "Schedule",
    "SecurityHealthService",
    "Winmgmt",
    "WinDefend",
    "BFE",
    "CoreMessagingRegistrar",
    "CryptSvc",
    "DcomLaunch",
    "LSM",
    "NlaSvc",
    "nsi",
    "PlugPlay",
    "Power",
    "ProfSvc",
    "SystemEventsBroker",
    "Themes",
    "UserManager",
    "Wcmsvc",
    "WlanSvc",
];

const RECOMMENDED_DISABLE: &[&str] = &[
    "DiagTrack",
    "dmwappushservice",
    "MapsBroker",
    "RetailDemo",
    "WMPNetworkSvc",
    "WSearch",
    "Fax",
    "XblAuthManager",
    "XblGameSave",
    "XboxGipSvc",
    "XboxNetApiSvc",
    "Spooler",
    "SysMain",
    "TabletInputService",
    "lfsvc",
    "wisvc",
    "wuauserv",
];

fn classify_service(name: &str) -> &'static str {
    if ESSENTIAL_SERVICES.iter().any(|&s| s.eq_ignore_ascii_case(name)) {
        "esencial"
    } else if RECOMMENDED_DISABLE.iter().any(|&s| s.eq_ignore_ascii_case(name)) {
        "recomendado_desactivar"
    } else {
        "opcional"
    }
}

#[tauri::command]
pub async fn get_services() -> Result<Vec<ServiceInfo>, String> {
    let script = r#"
Get-Service | ForEach-Object {
    $svc = $_
    $wmi = Get-CimInstance Win32_Service -Filter "Name='$($svc.Name)'" -ErrorAction SilentlyContinue
    $deps = ($svc.DependentServices | Select-Object -ExpandProperty Name) -join ','
    @{
        name = $svc.Name
        display_name = $svc.DisplayName
        description = if ($wmi) { $wmi.Description } else { '' }
        status = $svc.Status.ToString()
        start_type = $svc.StartType.ToString()
        dependencies = $deps
    }
} | ConvertTo-Json -Compress
"#;

    let result = powershell::run_ps(script)?;
    if !result.success {
        return Err(format!("Error listing services: {}", result.stderr));
    }

    let output = result.stdout.trim();
    if output.is_empty() {
        return Ok(vec![]);
    }

    let parsed: Vec<serde_json::Value> =
        serde_json::from_str(output).unwrap_or_default();

    Ok(parsed
        .iter()
        .map(|svc| {
            let name = svc["name"].as_str().unwrap_or("").to_string();
            let deps_str = svc["dependencies"].as_str().unwrap_or("");
            let deps: Vec<String> = if deps_str.is_empty() {
                vec![]
            } else {
                deps_str.split(',').map(|s| s.trim().to_string()).collect()
            };

            ServiceInfo {
                classification: classify_service(&name).to_string(),
                name,
                display_name: svc["display_name"].as_str().unwrap_or("").to_string(),
                description: svc["description"].as_str().unwrap_or("").to_string(),
                status: svc["status"].as_str().unwrap_or("").to_string(),
                start_type: svc["start_type"].as_str().unwrap_or("").to_string(),
                dependencies: deps,
            }
        })
        .collect())
}

#[tauri::command]
pub async fn set_service_start_type(
    db: State<'_, Database>,
    name: String,
    display_name: String,
    current_start_type: String,
    new_start_type: String,
) -> Result<(), String> {
    let scan_id = db.insert_scan(
        "servicios",
        &format!("Servicio modificado: {}", &display_name),
        Some(&format!(
            "{} → {}",
            &current_start_type, &new_start_type
        )),
        0,
    )?;

    db.insert_change(
        Some(scan_id),
        "servicios",
        "service",
        &name,
        &current_start_type,
        &new_start_type,
    )?;

    let script = format!(
        "Set-Service -Name '{}' -StartupType '{}'",
        name.replace('\'', "''"),
        new_start_type
    );
    let result = powershell::run_ps_elevated(&script)?;
    if !result.success {
        return Err(format!(
            "Error al modificar servicio {}: {}",
            name, result.stderr
        ));
    }

    Ok(())
}
