use crate::db::Database;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanableItem {
    pub category: String,
    pub path: String,
    pub size_bytes: u64,
    pub description: String,
    pub item_type: String, // "directory" or "file"
}

#[derive(Debug, Serialize)]
pub struct ScanResult {
    pub categories: Vec<CategoryResult>,
    pub total_bytes: u64,
    pub total_files: u64,
}

#[derive(Debug, Serialize)]
pub struct CategoryResult {
    pub name: String,
    pub description: String,
    pub path: String,
    pub size_bytes: u64,
    pub file_count: u64,
    pub items: Vec<CleanableItem>,
}

fn dir_size(path: &Path) -> (u64, u64) {
    let mut total_size = 0u64;
    let mut file_count = 0u64;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_file() {
                if let Ok(meta) = p.metadata() {
                    total_size += meta.len();
                    file_count += 1;
                }
            } else if p.is_dir() {
                let (s, c) = dir_size(&p);
                total_size += s;
                file_count += c;
            }
        }
    }
    (total_size, file_count)
}

fn collect_files(path: &Path) -> Vec<CleanableItem> {
    let mut items = Vec::new();
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_file() {
                if let Ok(meta) = p.metadata() {
                    items.push(CleanableItem {
                        category: String::new(),
                        path: p.to_string_lossy().to_string(),
                        size_bytes: meta.len(),
                        description: String::new(),
                        item_type: "file".to_string(),
                    });
                }
            }
        }
    }
    items
}

fn env_path(var: &str) -> Option<PathBuf> {
    std::env::var(var).ok().map(PathBuf::from)
}

fn scan_category(
    name: &str,
    description: &str,
    path: PathBuf,
) -> Option<CategoryResult> {
    if !path.exists() {
        return None;
    }
    let (size_bytes, file_count) = dir_size(&path);
    if file_count == 0 {
        return None;
    }
    let items = collect_files(&path);
    Some(CategoryResult {
        name: name.to_string(),
        description: description.to_string(),
        path: path.to_string_lossy().to_string(),
        size_bytes,
        file_count,
        items,
    })
}

#[tauri::command]
pub async fn scan_temp_files() -> Result<ScanResult, String> {
    let mut categories = Vec::new();

    // System TEMP
    if let Some(p) = env_path("SystemRoot") {
        if let Some(cat) = scan_category(
            "Temp del sistema",
            "Archivos temporales del sistema operativo",
            p.join("Temp"),
        ) {
            categories.push(cat);
        }
    }

    // User TEMP
    if let Some(p) = env_path("TEMP") {
        if let Some(cat) = scan_category(
            "Temp del usuario",
            "Archivos temporales del perfil de usuario",
            PathBuf::from(p),
        ) {
            categories.push(cat);
        }
    }

    // Windows Update cache
    if let Some(p) = env_path("SystemRoot") {
        if let Some(cat) = scan_category(
            "Caché Windows Update",
            "Descargas de actualizaciones ya instaladas",
            p.join("SoftwareDistribution").join("Download"),
        ) {
            categories.push(cat);
        }
    }

    // Thumbnail cache
    if let Some(p) = env_path("LOCALAPPDATA") {
        if let Some(cat) = scan_category(
            "Miniaturas",
            "Caché de miniaturas del explorador de archivos",
            PathBuf::from(&p)
                .join("Microsoft")
                .join("Windows")
                .join("Explorer"),
        ) {
            categories.push(cat);
        }
    }

    // Prefetch
    if let Some(p) = env_path("SystemRoot") {
        if let Some(cat) = scan_category(
            "Prefetch",
            "Datos de pre-carga de aplicaciones",
            p.join("Prefetch"),
        ) {
            categories.push(cat);
        }
    }

    // Memory dumps
    if let Some(p) = env_path("SystemRoot") {
        let dump_dir = p.join("Minidump");
        if dump_dir.exists() {
            if let Some(cat) = scan_category(
                "Volcados de memoria",
                "Archivos .dmp de diagnóstico de errores",
                dump_dir,
            ) {
                categories.push(cat);
            }
        }
    }

    // Chrome cache
    if let Some(p) = env_path("LOCALAPPDATA") {
        let chrome_cache = PathBuf::from(&p)
            .join("Google")
            .join("Chrome")
            .join("User Data")
            .join("Default")
            .join("Cache")
            .join("Cache_Data");
        if let Some(cat) = scan_category(
            "Chrome Cache",
            "Caché del navegador Google Chrome",
            chrome_cache,
        ) {
            categories.push(cat);
        }
    }

    // Edge cache
    if let Some(p) = env_path("LOCALAPPDATA") {
        let edge_cache = PathBuf::from(&p)
            .join("Microsoft")
            .join("Edge")
            .join("User Data")
            .join("Default")
            .join("Cache")
            .join("Cache_Data");
        if let Some(cat) = scan_category(
            "Edge Cache",
            "Caché del navegador Microsoft Edge",
            edge_cache,
        ) {
            categories.push(cat);
        }
    }

    // Firefox cache
    if let Some(p) = env_path("LOCALAPPDATA") {
        let ff_base = PathBuf::from(&p)
            .join("Mozilla")
            .join("Firefox")
            .join("Profiles");
        if ff_base.exists() {
            if let Ok(entries) = fs::read_dir(&ff_base) {
                for entry in entries.flatten() {
                    let cache_dir = entry.path().join("cache2").join("entries");
                    if let Some(cat) = scan_category(
                        "Firefox Cache",
                        "Caché del navegador Mozilla Firefox",
                        cache_dir,
                    ) {
                        categories.push(cat);
                        break;
                    }
                }
            }
        }
    }

    // Opera GX cache
    if let Some(p) = env_path("APPDATA") {
        let opera_cache = PathBuf::from(&p)
            .join("Opera Software")
            .join("Opera GX Stable")
            .join("Cache")
            .join("Cache_Data");
        if let Some(cat) = scan_category(
            "Opera GX Cache",
            "Caché del navegador Opera GX",
            opera_cache,
        ) {
            categories.push(cat);
        }
    }

    // Empty folders in user profile
    if let Some(p) = env_path("USERPROFILE") {
        let profile = PathBuf::from(p);
        let mut empty_dirs = Vec::new();
        find_empty_dirs(&profile, &mut empty_dirs, 0);
        if !empty_dirs.is_empty() {
            let items: Vec<CleanableItem> = empty_dirs
                .iter()
                .map(|d| CleanableItem {
                    category: "Carpetas vacías".to_string(),
                    path: d.to_string_lossy().to_string(),
                    size_bytes: 0,
                    description: "Carpeta vacía".to_string(),
                    item_type: "directory".to_string(),
                })
                .collect();
            categories.push(CategoryResult {
                name: "Carpetas vacías".to_string(),
                description: "Carpetas vacías en el perfil del usuario".to_string(),
                path: "Perfil del usuario".to_string(),
                size_bytes: 0,
                file_count: items.len() as u64,
                items,
            });
        }
    }

    let total_bytes = categories.iter().map(|c| c.size_bytes).sum();
    let total_files = categories.iter().map(|c| c.file_count).sum();

    Ok(ScanResult {
        categories,
        total_bytes,
        total_files,
    })
}

fn find_empty_dirs(path: &Path, result: &mut Vec<PathBuf>, depth: u32) {
    if depth > 3 {
        return;
    }
    let dominated = [
        "AppData", ".git", "node_modules", ".vscode", "Desktop",
        "Documents", "Downloads", "Music", "Pictures", "Videos",
        "OneDrive", ".cache", ".config",
    ];
    if let Ok(entries) = fs::read_dir(path) {
        let entries: Vec<_> = entries.flatten().collect();
        if depth > 0 && entries.is_empty() {
            result.push(path.to_path_buf());
            return;
        }
        for entry in entries {
            let p = entry.path();
            if p.is_dir() {
                let name = p.file_name().unwrap_or_default().to_string_lossy();
                if !dominated.contains(&name.as_ref()) {
                    find_empty_dirs(&p, result, depth + 1);
                }
            }
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CleanRequest {
    pub paths: Vec<String>,
    pub category: String,
}

#[tauri::command]
pub async fn clean_selected_files(
    db: State<'_, Database>,
    requests: Vec<CleanRequest>,
) -> Result<u64, String> {
    let mut total_freed: u64 = 0;
    let mut total_files: u64 = 0;
    let mut errors: Vec<String> = Vec::new();

    for req in &requests {
        for path_str in &req.paths {
            let path = Path::new(path_str);
            if path.is_file() {
                let size = path.metadata().map(|m| m.len()).unwrap_or(0);
                match fs::remove_file(path) {
                    Ok(()) => {
                        total_freed += size;
                        total_files += 1;
                    }
                    Err(e) => {
                        errors.push(format!("{}: {}", path_str, e));
                    }
                }
            } else if path.is_dir() {
                match fs::remove_dir(path) {
                    Ok(()) => {
                        total_files += 1;
                    }
                    Err(e) => {
                        errors.push(format!("{}: {}", path_str, e));
                    }
                }
            }
        }
    }

    let categories: Vec<String> = requests.iter().map(|r| r.category.clone()).collect();
    let details = if errors.is_empty() {
        format!(
            "{} archivos eliminados, {} liberados · Categorías: {}",
            total_files,
            format_bytes(total_freed),
            categories.join(", ")
        )
    } else {
        format!(
            "{} archivos eliminados, {} liberados · {} errores · Categorías: {}",
            total_files,
            format_bytes(total_freed),
            errors.len(),
            categories.join(", ")
        )
    };

    let scan_id = db.insert_scan(
        "limpieza",
        "Limpieza de archivos",
        Some(&details),
        total_freed as i64,
    )?;

    for req in &requests {
        for path_str in &req.paths {
            let path = Path::new(path_str);
            let size = if path.exists() {
                path.metadata().map(|m| m.len()).unwrap_or(0) as i64
            } else {
                0
            };
            let _ = db.insert_deleted_file(scan_id, path_str, size, &req.category);
        }
    }

    Ok(total_freed)
}

fn format_bytes(bytes: u64) -> String {
    if bytes == 0 {
        return "0 B".to_string();
    }
    let units = ["B", "KB", "MB", "GB"];
    let i = (bytes as f64).log(1024.0).floor() as usize;
    let i = i.min(units.len() - 1);
    format!("{:.1} {}", bytes as f64 / 1024f64.powi(i as i32), units[i])
}
