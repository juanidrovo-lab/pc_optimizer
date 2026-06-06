use crate::db::models::{ChangeLog, RestorePoint, ScanHistory};
use crate::db::Database;
use crate::utils::powershell;
use tauri::State;

#[tauri::command]
pub async fn get_scan_history(db: State<'_, Database>) -> Result<Vec<ScanHistory>, String> {
    db.get_scan_history()
}

#[tauri::command]
pub async fn get_change_log(db: State<'_, Database>) -> Result<Vec<ChangeLog>, String> {
    db.get_change_log()
}

#[tauri::command]
pub async fn get_pending_changes(db: State<'_, Database>) -> Result<Vec<ChangeLog>, String> {
    db.get_pending_changes()
}

#[tauri::command]
pub async fn get_restore_points(db: State<'_, Database>) -> Result<Vec<RestorePoint>, String> {
    db.get_restore_points()
}

#[tauri::command]
pub async fn revert_change(db: State<'_, Database>, change_id: i64) -> Result<(), String> {
    let change = db.get_change(change_id)?;

    if change.reverted {
        return Err("Este cambio ya fue revertido".to_string());
    }

    match change.change_type.as_str() {
        "registry" => revert_registry(&change)?,
        "service" => revert_service(&change)?,
        "dns" => revert_dns(&change)?,
        "startup" => revert_startup(&change)?,
        "nagle" => revert_registry(&change)?,
        "ipv6" => revert_ipv6(&change)?,
        _ => {
            return Err(format!(
                "Tipo de cambio '{}' no soporta reversión automática",
                change.change_type
            ));
        }
    }

    db.mark_reverted(change_id)?;
    Ok(())
}

fn revert_registry(change: &ChangeLog) -> Result<(), String> {
    let script = format!(
        "Set-ItemProperty -Path '{}' -Name '{}' -Value {}",
        extract_reg_path(&change.target),
        extract_reg_name(&change.target),
        &change.previous_value
    );
    let result = powershell::run_ps_elevated(&script)?;
    if !result.success {
        return Err(format!("Error al revertir registro: {}", result.stderr));
    }
    Ok(())
}

fn revert_service(change: &ChangeLog) -> Result<(), String> {
    let script = format!(
        "Set-Service -Name '{}' -StartupType '{}'",
        &change.target, &change.previous_value
    );
    let result = powershell::run_ps_elevated(&script)?;
    if !result.success {
        return Err(format!("Error al revertir servicio: {}", result.stderr));
    }
    Ok(())
}

fn revert_dns(change: &ChangeLog) -> Result<(), String> {
    let script = if change.previous_value == "DHCP" {
        format!(
            "Set-DnsClientServerAddress -InterfaceAlias '{}' -ResetServerAddresses",
            &change.target
        )
    } else {
        format!(
            "Set-DnsClientServerAddress -InterfaceAlias '{}' -ServerAddresses @({})",
            &change.target, &change.previous_value
        )
    };
    let result = powershell::run_ps_elevated(&script)?;
    if !result.success {
        return Err(format!("Error al revertir DNS: {}", result.stderr));
    }
    Ok(())
}

fn revert_startup(change: &ChangeLog) -> Result<(), String> {
    let reg_path = if change.target.contains("HKLM") {
        "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"
    } else {
        "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"
    };

    if change.new_value == "disabled" {
        let original_cmd = &change.previous_value;
        if original_cmd.is_empty() || original_cmd == "enabled" {
            return Err("No se encontró el comando original para restaurar".to_string());
        }
        let script = format!(
            "New-ItemProperty -Path '{}' -Name '{}' -Value '{}' -PropertyType String -Force",
            reg_path,
            change.target.replace('\'', "''"),
            original_cmd.replace('\'', "''")
        );
        let result = powershell::run_ps_elevated(&script)?;
        if !result.success {
            return Err(format!("Error al revertir arranque: {}", result.stderr));
        }
    } else {
        let script = format!(
            "Remove-ItemProperty -Path '{}' -Name '{}' -ErrorAction Stop",
            reg_path,
            change.target.replace('\'', "''")
        );
        let result = powershell::run_ps_elevated(&script)?;
        if !result.success {
            return Err(format!("Error al revertir arranque: {}", result.stderr));
        }
    }
    Ok(())
}

fn revert_ipv6(change: &ChangeLog) -> Result<(), String> {
    let enable = change.previous_value == "enabled";
    let script = if enable {
        format!(
            "Enable-NetAdapterBinding -Name '{}' -ComponentID ms_tcpip6",
            &change.target
        )
    } else {
        format!(
            "Disable-NetAdapterBinding -Name '{}' -ComponentID ms_tcpip6",
            &change.target
        )
    };
    let result = powershell::run_ps_elevated(&script)?;
    if !result.success {
        return Err(format!("Error al revertir IPv6: {}", result.stderr));
    }
    Ok(())
}

#[tauri::command]
pub async fn create_restore_point(
    db: State<'_, Database>,
    description: String,
) -> Result<i64, String> {
    let script = format!(
        "Checkpoint-Computer -Description '{}' -RestorePointType 'MODIFY_SETTINGS'",
        description.replace('\'', "''")
    );
    let result = powershell::run_ps_elevated(&script)?;
    if !result.success {
        return Err(format!(
            "Error al crear punto de restauración: {}",
            result.stderr
        ));
    }
    db.insert_restore_point(None, &description)
}

fn extract_reg_path(target: &str) -> &str {
    match target.rfind('\\') {
        Some(pos) => &target[..pos],
        None => target,
    }
}

fn extract_reg_name(target: &str) -> &str {
    match target.rfind('\\') {
        Some(pos) => &target[pos + 1..],
        None => target,
    }
}
