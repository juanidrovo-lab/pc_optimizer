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
  cpu_name: string;
  cpu_cores: number;
  cpu_threads: number;
  ram_total_mb: number;
  ram_used_mb: number;
  ram_available_mb: number;
  disk_total_gb: number;
  disk_used_gb: number;
  disk_free_gb: number;
  disk_read_speed: number;
  disk_write_speed: number;
  uptime_seconds: number;
  gpu_name: string;
}

export interface TemperatureData {
  cpu_temp: number | null;
  gpu_temp: number | null;
  disk_temp: number | null;
  source: string;
}

export interface SmartAttribute {
  id: number;
  name: string;
  value: string;
  worst: string;
  threshold: string;
  raw: string;
}

export interface SmartData {
  status: string;
  power_on_hours: number | null;
  power_cycles: number | null;
  temperature: number | null;
  data_written_tb: number | null;
  data_read_tb: number | null;
  model: string;
  serial: string;
  firmware: string;
  attributes: SmartAttribute[];
  available: boolean;
}

export interface BatteryHealth {
  design_capacity_mwh: number;
  full_charge_capacity_mwh: number;
  health_percent: number;
  cycle_count: number | null;
  available: boolean;
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
