export interface ScanHistory {
  id: number;
  module: string;
  action: string;
  details: string | null;
  bytes_freed: number;
  created_at: string;
}

export interface ChangeLog {
  id: number;
  scan_id: number | null;
  module: string;
  change_type: string;
  target: string;
  previous_value: string;
  new_value: string;
  reverted: boolean;
  reverted_at: string | null;
  created_at: string;
}

export interface CleanableItem {
  category: string;
  path: string;
  size_bytes: number;
  description: string;
  item_type: string;
}

export interface CategoryResult {
  name: string;
  description: string;
  path: string;
  size_bytes: number;
  file_count: number;
  items: CleanableItem[];
}

export interface ScanResult {
  categories: CategoryResult[];
  total_bytes: number;
  total_files: number;
}

export interface SystemHealth {
  cpu_usage: number;
  ram_total_mb: number;
  ram_used_mb: number;
  disk_total_gb: number;
  disk_used_gb: number;
  uptime_seconds: number;
}

export interface StartupItem {
  name: string;
  path: string;
  enabled: boolean;
  impact: string;
}

export interface ServiceInfo {
  name: string;
  display_name: string;
  description: string;
  status: string;
  start_type: string;
  classification: string;
}

export interface NetworkStatus {
  ipv6_enabled: boolean;
  nagle_enabled: boolean;
  current_dns: string[];
}

export interface PingResult {
  server: string;
  region: string;
  latency_ms: number | null;
}

export interface RestorePoint {
  id: number;
  scan_id: number | null;
  description: string;
  created_at: string;
}

export interface DeletedFile {
  id: number;
  scan_id: number;
  path: string;
  size_bytes: number;
  category: string;
  created_at: string;
}
