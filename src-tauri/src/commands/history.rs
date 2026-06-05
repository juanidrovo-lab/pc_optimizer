use crate::db::models::{ChangeLog, ScanHistory};
use crate::db::Database;
use tauri::State;

#[tauri::command]
pub async fn get_scan_history(db: State<'_, Database>) -> Result<Vec<ScanHistory>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, module, action, details, bytes_freed, created_at FROM scan_history ORDER BY created_at DESC LIMIT 100")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(ScanHistory {
                id: row.get(0)?,
                module: row.get(1)?,
                action: row.get(2)?,
                details: row.get(3)?,
                bytes_freed: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row.map_err(|e| e.to_string())?);
    }
    Ok(results)
}

#[tauri::command]
pub async fn get_change_log(db: State<'_, Database>) -> Result<Vec<ChangeLog>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, scan_id, module, change_type, target, previous_value, new_value, reverted, reverted_at, created_at FROM change_log ORDER BY created_at DESC LIMIT 200")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(ChangeLog {
                id: row.get(0)?,
                scan_id: row.get(1)?,
                module: row.get(2)?,
                change_type: row.get(3)?,
                target: row.get(4)?,
                previous_value: row.get(5)?,
                new_value: row.get(6)?,
                reverted: row.get(7)?,
                reverted_at: row.get(8)?,
                created_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row.map_err(|e| e.to_string())?);
    }
    Ok(results)
}

#[tauri::command]
pub async fn revert_change(db: State<'_, Database>, change_id: i64) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let change: ChangeLog = conn
        .query_row(
            "SELECT id, scan_id, module, change_type, target, previous_value, new_value, reverted, reverted_at, created_at FROM change_log WHERE id = ?1",
            [change_id],
            |row| {
                Ok(ChangeLog {
                    id: row.get(0)?,
                    scan_id: row.get(1)?,
                    module: row.get(2)?,
                    change_type: row.get(3)?,
                    target: row.get(4)?,
                    previous_value: row.get(5)?,
                    new_value: row.get(6)?,
                    reverted: row.get(7)?,
                    reverted_at: row.get(8)?,
                    created_at: row.get(9)?,
                })
            },
        )
        .map_err(|e| format!("Change not found: {}", e))?;

    if change.reverted {
        return Err("This change has already been reverted".to_string());
    }

    // The actual revert logic will be dispatched by change_type in step 5
    // For now, just mark it as reverted
    conn.execute(
        "UPDATE change_log SET reverted = 1, reverted_at = datetime('now','localtime') WHERE id = ?1",
        [change_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
