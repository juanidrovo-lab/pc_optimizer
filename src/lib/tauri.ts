import { invoke } from "@tauri-apps/api/core";
import type {
  ScanResult,
  SystemHealth,
  StartupItem,
  ServiceInfo,
  NetworkStatus,
  PingResult,
  ScanHistory,
  ChangeLog,
  RestorePoint,
} from "./types";

export async function scanTempFiles(): Promise<ScanResult> {
  return invoke("scan_temp_files");
}

export async function cleanSelectedFiles(paths: string[]): Promise<number> {
  return invoke("clean_selected_files", { paths });
}

export async function getSystemHealth(): Promise<SystemHealth> {
  return invoke("get_system_health");
}

export async function getStartupItems(): Promise<StartupItem[]> {
  return invoke("get_startup_items");
}

export async function toggleStartupItem(
  name: string,
  enable: boolean
): Promise<void> {
  return invoke("toggle_startup_item", { name, enable });
}

export async function getServices(): Promise<ServiceInfo[]> {
  return invoke("get_services");
}

export async function setServiceStartType(
  name: string,
  startType: string
): Promise<void> {
  return invoke("set_service_start_type", { name, startType });
}

export async function getNetworkStatus(): Promise<NetworkStatus> {
  return invoke("get_network_status");
}

export async function pingServers(): Promise<PingResult[]> {
  return invoke("ping_servers");
}

export async function getScanHistory(): Promise<ScanHistory[]> {
  return invoke("get_scan_history");
}

export async function getChangeLog(): Promise<ChangeLog[]> {
  return invoke("get_change_log");
}

export async function getPendingChanges(): Promise<ChangeLog[]> {
  return invoke("get_pending_changes");
}

export async function getRestorePoints(): Promise<RestorePoint[]> {
  return invoke("get_restore_points");
}

export async function revertChange(changeId: number): Promise<void> {
  return invoke("revert_change", { changeId });
}

export async function createRestorePoint(description: string): Promise<number> {
  return invoke("create_restore_point", { description });
}
