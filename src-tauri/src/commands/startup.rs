use crate::db::Database;
use crate::utils::powershell;
use serde::Serialize;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct StartupItem {
    pub name: String,
    pub command: String,
    pub location: String,
    pub enabled: bool,
    pub user: String,
}

#[derive(Debug, Serialize)]
pub struct BootTime {
    pub last_boot_ms: u64,
    pub average_boot_ms: u64,
}

#[tauri::command]
pub async fn get_startup_items() -> Result<Vec<StartupItem>, String> {
    let script = r#"
$items = @()

# Registry Run keys (current user)
$cuRun = Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -ErrorAction SilentlyContinue
if ($cuRun) {
    $cuRun.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object {
        $items += @{ name = $_.Name; command = $_.Value; location = 'HKCU\Run'; enabled = $true; user = 'Current' }
    }
}

# Registry Run keys (local machine)
$lmRun = Get-ItemProperty -Path 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run' -ErrorAction SilentlyContinue
if ($lmRun) {
    $lmRun.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object {
        $items += @{ name = $_.Name; command = $_.Value; location = 'HKLM\Run'; enabled = $true; user = 'All Users' }
    }
}

# Task Manager startup (via Get-CimInstance)
$startupApps = Get-CimInstance Win32_StartupCommand -ErrorAction SilentlyContinue
if ($startupApps) {
    foreach ($app in $startupApps) {
        $exists = $items | Where-Object { $_.name -eq $app.Name }
        if (-not $exists) {
            $items += @{ name = $app.Name; command = $app.Command; location = $app.Location; enabled = $true; user = $app.User }
        }
    }
}

ConvertTo-Json -InputObject $items -Compress
"#;

    let result = powershell::run_ps(script)?;
    if !result.success {
        return Err(format!("Error listing startup items: {}", result.stderr));
    }

    let output = result.stdout.trim();
    if output.is_empty() || output == "null" {
        return Ok(vec![]);
    }

    let parsed: Vec<serde_json::Value> =
        serde_json::from_str(output).unwrap_or_default();

    Ok(parsed
        .iter()
        .map(|item| StartupItem {
            name: item["name"].as_str().unwrap_or("").to_string(),
            command: item["command"].as_str().unwrap_or("").to_string(),
            location: item["location"].as_str().unwrap_or("").to_string(),
            enabled: item["enabled"].as_bool().unwrap_or(true),
            user: item["user"].as_str().unwrap_or("").to_string(),
        })
        .collect())
}

#[tauri::command]
pub async fn toggle_startup_item(
    db: State<'_, Database>,
    name: String,
    location: String,
    enable: bool,
) -> Result<(), String> {
    let previous = if enable { "disabled" } else { "enabled" };
    let new_val = if enable { "enabled" } else { "disabled" };

    let reg_path = if location.contains("HKCU") {
        "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run".to_string()
    } else {
        "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run".to_string()
    };

    let needs_elevation = location.contains("HKLM");

    if enable {
        let last_change = db.get_last_change_for_target("startup", &name)?;
        let original_command = last_change
            .map(|c| c.previous_value.clone())
            .unwrap_or_default();
        if original_command.is_empty() || original_command == "disabled" {
            return Err(format!(
                "No se encontró el comando original para '{}'. Re-habilitar manualmente.",
                name
            ));
        }

        let script = format!(
            "New-ItemProperty -Path '{}' -Name '{}' -Value '{}' -PropertyType String -Force",
            reg_path,
            name.replace('\'', "''"),
            original_command.replace('\'', "''")
        );

        let scan_id = db.insert_scan(
            "arranque",
            &format!("Programa de inicio habilitado: {}", &name),
            Some(&format!("Ubicación: {}", &location)),
            0,
        )?;

        db.insert_change(
            Some(scan_id),
            "arranque",
            "startup",
            &name,
            previous,
            new_val,
        )?;

        let result = if needs_elevation {
            powershell::run_ps_elevated(&script)?
        } else {
            powershell::run_ps(&script)?
        };
        if !result.success {
            return Err(format!("Error al habilitar {}: {}", name, result.stderr));
        }
    } else {
        let get_cmd_script = format!(
            "(Get-ItemProperty -Path '{}' -Name '{}' -ErrorAction Stop).'{}'",
            reg_path,
            name.replace('\'', "''"),
            name.replace('\'', "''")
        );
        let cmd_result = powershell::run_ps(&get_cmd_script).unwrap_or(powershell::PsResult {
            stdout: String::new(),
            stderr: String::new(),
            success: false,
        });
        let original_command = cmd_result.stdout.trim().to_string();

        let prev = if original_command.is_empty() {
            previous.to_string()
        } else {
            original_command
        };

        let scan_id = db.insert_scan(
            "arranque",
            &format!("Programa de inicio deshabilitado: {}", &name),
            Some(&format!("Ubicación: {}", &location)),
            0,
        )?;

        db.insert_change(
            Some(scan_id),
            "arranque",
            "startup",
            &name,
            &prev,
            new_val,
        )?;

        let script = format!(
            "Remove-ItemProperty -Path '{}' -Name '{}' -ErrorAction Stop",
            reg_path,
            name.replace('\'', "''")
        );

        let result = if needs_elevation {
            powershell::run_ps_elevated(&script)?
        } else {
            powershell::run_ps(&script)?
        };
        if !result.success {
            return Err(format!("Error al deshabilitar {}: {}", name, result.stderr));
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn get_boot_times() -> Result<BootTime, String> {
    let script = r#"
$lastBoot = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime
$bootEvents = Get-WinEvent -FilterHashtable @{LogName='System'; ID=6005} -MaxEvents 5 -ErrorAction SilentlyContinue

$lastBootMs = 0
$avgMs = 0

# Get last boot duration from event log
$bootDuration = Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Diagnostics-Performance/Operational'; ID=100} -MaxEvents 5 -ErrorAction SilentlyContinue
if ($bootDuration) {
    $times = $bootDuration | ForEach-Object {
        [xml]$xml = $_.ToXml()
        $ns = @{e='http://schemas.microsoft.com/win/2004/08/events/event'}
        $node = Select-Xml -Xml $xml -XPath '//e:Data[@Name="BootTime"]' -Namespace $ns
        if ($node) { [uint64]$node.Node.'#text' }
    } | Where-Object { $_ -gt 0 }

    if ($times.Count -gt 0) {
        $lastBootMs = $times[0]
        $avgMs = [uint64]($times | Measure-Object -Average).Average
    }
}

@{ last_boot_ms = $lastBootMs; average_boot_ms = $avgMs } | ConvertTo-Json -Compress
"#;

    let result = powershell::run_ps(script)?;
    let parsed: serde_json::Value =
        serde_json::from_str(result.stdout.trim()).unwrap_or(serde_json::Value::Null);

    Ok(BootTime {
        last_boot_ms: parsed["last_boot_ms"].as_u64().unwrap_or(0),
        average_boot_ms: parsed["average_boot_ms"].as_u64().unwrap_or(0),
    })
}
