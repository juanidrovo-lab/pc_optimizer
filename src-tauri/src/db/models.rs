use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ScanHistory {
    pub id: i64,
    pub module: String,
    pub action: String,
    pub details: Option<String>,
    pub bytes_freed: i64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChangeLog {
    pub id: i64,
    pub scan_id: Option<i64>,
    pub module: String,
    pub change_type: String,
    pub target: String,
    pub previous_value: String,
    pub new_value: String,
    pub reverted: bool,
    pub reverted_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RestorePoint {
    pub id: i64,
    pub scan_id: Option<i64>,
    pub description: String,
    pub created_at: String,
}
