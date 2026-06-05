pub mod models;

use rusqlite::Connection;
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
            ",
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }
}
