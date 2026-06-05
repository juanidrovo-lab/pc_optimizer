pub mod models;

use models::{ChangeLog, RestorePoint, ScanHistory};
use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(app_dir: PathBuf) -> Result<Self, String> {
        std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
        let db_path = app_dir.join("pcoptimizer.db");
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
            .map_err(|e| e.to_string())?;
        let db = Self {
            conn: Mutex::new(conn),
        };
        db.run_migrations()?;
        Ok(db)
    }

    fn run_migrations(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS scan_history (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                module      TEXT NOT NULL,
                action      TEXT NOT NULL,
                details     TEXT,
                bytes_freed INTEGER DEFAULT 0,
                created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS change_log (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                scan_id         INTEGER REFERENCES scan_history(id),
                module          TEXT NOT NULL,
                change_type     TEXT NOT NULL,
                target          TEXT NOT NULL,
                previous_value  TEXT NOT NULL,
                new_value       TEXT NOT NULL,
                reverted        INTEGER DEFAULT 0,
                reverted_at     TEXT,
                created_at      TEXT NOT NULL DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS restore_points (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                scan_id     INTEGER REFERENCES scan_history(id),
                description TEXT NOT NULL,
                created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
            );

            CREATE TABLE IF NOT EXISTS deleted_files (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                scan_id     INTEGER REFERENCES scan_history(id),
                path        TEXT NOT NULL,
                size_bytes  INTEGER NOT NULL,
                category    TEXT NOT NULL,
                created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
            );
            ",
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn insert_scan(
        &self,
        module: &str,
        action: &str,
        details: Option<&str>,
        bytes_freed: i64,
    ) -> Result<i64, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO scan_history (module, action, details, bytes_freed) VALUES (?1, ?2, ?3, ?4)",
            params![module, action, details, bytes_freed],
        )
        .map_err(|e| e.to_string())?;
        Ok(conn.last_insert_rowid())
    }

    pub fn insert_change(
        &self,
        scan_id: Option<i64>,
        module: &str,
        change_type: &str,
        target: &str,
        previous_value: &str,
        new_value: &str,
    ) -> Result<i64, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO change_log (scan_id, module, change_type, target, previous_value, new_value) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![scan_id, module, change_type, target, previous_value, new_value],
        )
        .map_err(|e| e.to_string())?;
        Ok(conn.last_insert_rowid())
    }

    pub fn mark_reverted(&self, change_id: i64) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE change_log SET reverted = 1, reverted_at = datetime('now','localtime') WHERE id = ?1",
            params![change_id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_change(&self, change_id: i64) -> Result<ChangeLog, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT id, scan_id, module, change_type, target, previous_value, new_value, reverted, reverted_at, created_at FROM change_log WHERE id = ?1",
            params![change_id],
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
        .map_err(|e| format!("Change not found: {}", e))
    }

    pub fn insert_restore_point(
        &self,
        scan_id: Option<i64>,
        description: &str,
    ) -> Result<i64, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO restore_points (scan_id, description) VALUES (?1, ?2)",
            params![scan_id, description],
        )
        .map_err(|e| e.to_string())?;
        Ok(conn.last_insert_rowid())
    }

    pub fn insert_deleted_file(
        &self,
        scan_id: i64,
        path: &str,
        size_bytes: i64,
        category: &str,
    ) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO deleted_files (scan_id, path, size_bytes, category) VALUES (?1, ?2, ?3, ?4)",
            params![scan_id, path, size_bytes, category],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_scan_history(&self) -> Result<Vec<ScanHistory>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
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
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    pub fn get_change_log(&self) -> Result<Vec<ChangeLog>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
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
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    pub fn get_restore_points(&self) -> Result<Vec<RestorePoint>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, scan_id, description, created_at FROM restore_points ORDER BY created_at DESC LIMIT 50")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok(RestorePoint {
                    id: row.get(0)?,
                    scan_id: row.get(1)?,
                    description: row.get(2)?,
                    created_at: row.get(3)?,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    pub fn get_pending_changes(&self) -> Result<Vec<ChangeLog>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, scan_id, module, change_type, target, previous_value, new_value, reverted, reverted_at, created_at FROM change_log WHERE reverted = 0 ORDER BY created_at DESC")
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
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }
}
