use crate::utils::powershell;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct SystemHealth {
    pub cpu_usage: f64,
    pub cpu_name: String,
    pub cpu_cores: u32,
    pub cpu_threads: u32,
    pub ram_total_mb: u64,
    pub ram_used_mb: u64,
    pub ram_available_mb: u64,
    pub disk_total_gb: f64,
    pub disk_used_gb: f64,
    pub disk_free_gb: f64,
    pub disk_read_speed: f64,
    pub disk_write_speed: f64,
    pub uptime_seconds: u64,
    pub gpu_name: String,
}

#[derive(Debug, Serialize)]
pub struct TemperatureData {
    pub cpu_temp: Option<f64>,
    pub gpu_temp: Option<f64>,
    pub disk_temp: Option<f64>,
    pub source: String,
}

#[derive(Debug, Serialize)]
pub struct SmartData {
    pub status: String,
    pub power_on_hours: Option<u64>,
    pub power_cycles: Option<u64>,
    pub temperature: Option<u32>,
    pub data_written_tb: Option<f64>,
    pub data_read_tb: Option<f64>,
    pub model: String,
    pub serial: String,
    pub firmware: String,
    pub attributes: Vec<SmartAttribute>,
    pub available: bool,
}

#[derive(Debug, Serialize)]
pub struct SmartAttribute {
    pub id: u32,
    pub name: String,
    pub value: String,
    pub worst: String,
    pub threshold: String,
    pub raw: String,
}

#[derive(Debug, Serialize)]
pub struct BatteryHealth {
    pub design_capacity_mwh: u64,
    pub full_charge_capacity_mwh: u64,
    pub health_percent: f64,
    pub cycle_count: Option<u64>,
    pub available: bool,
}

#[tauri::command]
pub async fn get_system_health() -> Result<SystemHealth, String> {
    let script = r#"
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$os = Get-CimInstance Win32_OperatingSystem
$disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
$gpu = Get-CimInstance Win32_VideoController | Select-Object -First 1
$perf = Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'"
$diskPerf = Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk -Filter "Name='_Total'"

$uptime = (Get-Date) - $os.LastBootUpTime

$result = @{
    cpu_usage = [double]$perf.PercentProcessorTime
    cpu_name = $cpu.Name.Trim()
    cpu_cores = [int]$cpu.NumberOfCores
    cpu_threads = [int]$cpu.NumberOfLogicalProcessors
    ram_total_mb = [uint64]([math]::Round($os.TotalVisibleMemorySize / 1024))
    ram_used_mb = [uint64]([math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / 1024))
    ram_available_mb = [uint64]([math]::Round($os.FreePhysicalMemory / 1024))
    disk_total_gb = [math]::Round($disk.Size / 1GB, 2)
    disk_used_gb = [math]::Round(($disk.Size - $disk.FreeSpace) / 1GB, 2)
    disk_free_gb = [math]::Round($disk.FreeSpace / 1GB, 2)
    disk_read_speed = if ($diskPerf) { [math]::Round($diskPerf.DiskReadBytesPerSec / 1MB, 2) } else { 0 }
    disk_write_speed = if ($diskPerf) { [math]::Round($diskPerf.DiskWriteBytesPerSec / 1MB, 2) } else { 0 }
    uptime_seconds = [uint64]$uptime.TotalSeconds
    gpu_name = if ($gpu) { $gpu.Name.Trim() } else { "N/A" }
}
$result | ConvertTo-Json -Compress
"#;

    let result = powershell::run_ps(script)?;
    if !result.success {
        return Err(format!("Error getting system health: {}", result.stderr));
    }

    let parsed: serde_json::Value =
        serde_json::from_str(result.stdout.trim()).map_err(|e| e.to_string())?;

    Ok(SystemHealth {
        cpu_usage: parsed["cpu_usage"].as_f64().unwrap_or(0.0),
        cpu_name: parsed["cpu_name"]
            .as_str()
            .unwrap_or("Unknown")
            .to_string(),
        cpu_cores: parsed["cpu_cores"].as_u64().unwrap_or(0) as u32,
        cpu_threads: parsed["cpu_threads"].as_u64().unwrap_or(0) as u32,
        ram_total_mb: parsed["ram_total_mb"].as_u64().unwrap_or(0),
        ram_used_mb: parsed["ram_used_mb"].as_u64().unwrap_or(0),
        ram_available_mb: parsed["ram_available_mb"].as_u64().unwrap_or(0),
        disk_total_gb: parsed["disk_total_gb"].as_f64().unwrap_or(0.0),
        disk_used_gb: parsed["disk_used_gb"].as_f64().unwrap_or(0.0),
        disk_free_gb: parsed["disk_free_gb"].as_f64().unwrap_or(0.0),
        disk_read_speed: parsed["disk_read_speed"].as_f64().unwrap_or(0.0),
        disk_write_speed: parsed["disk_write_speed"].as_f64().unwrap_or(0.0),
        uptime_seconds: parsed["uptime_seconds"].as_u64().unwrap_or(0),
        gpu_name: parsed["gpu_name"]
            .as_str()
            .unwrap_or("Unknown")
            .to_string(),
    })
}

#[tauri::command]
pub async fn get_temperatures() -> Result<TemperatureData, String> {
    // LibreHardwareMonitorLib integration
    // Requires LibreHardwareMonitorLib.dll to be present
    // Falls back to indicating the source is unavailable
    let script = r#"
$lhmPath = Join-Path $env:ProgramFiles 'PCOptimizer\LibreHardwareMonitorLib.dll'
if (-not (Test-Path $lhmPath)) {
    $lhmPath = Join-Path $PSScriptRoot 'LibreHardwareMonitorLib.dll'
}
if (Test-Path $lhmPath) {
    Add-Type -Path $lhmPath
    $computer = New-Object LibreHardwareMonitor.Hardware.Computer
    $computer.IsCpuEnabled = $true
    $computer.IsGpuEnabled = $true
    $computer.Open()

    $cpuTemp = $null
    $gpuTemp = $null
    foreach ($hw in $computer.Hardware) {
        $hw.Update()
        foreach ($sensor in $hw.Sensors) {
            if ($sensor.SensorType -eq 'Temperature') {
                if ($hw.HardwareType -match 'Cpu' -and $sensor.Name -match 'Package|Core #0') {
                    if ($null -eq $cpuTemp) { $cpuTemp = $sensor.Value }
                }
                if ($hw.HardwareType -match 'Gpu' -and $sensor.Name -match 'GPU Core') {
                    if ($null -eq $gpuTemp) { $gpuTemp = $sensor.Value }
                }
            }
        }
    }
    $computer.Close()
    @{ cpu_temp = $cpuTemp; gpu_temp = $gpuTemp; disk_temp = $null; source = 'LibreHardwareMonitor' } | ConvertTo-Json -Compress
} else {
    @{ cpu_temp = $null; gpu_temp = $null; disk_temp = $null; source = 'unavailable' } | ConvertTo-Json -Compress
}
"#;

    let result = powershell::run_ps(script)?;
    if !result.success {
        return Ok(TemperatureData {
            cpu_temp: None,
            gpu_temp: None,
            disk_temp: None,
            source: "error".to_string(),
        });
    }

    let parsed: serde_json::Value =
        serde_json::from_str(result.stdout.trim()).map_err(|e| e.to_string())?;

    Ok(TemperatureData {
        cpu_temp: parsed["cpu_temp"].as_f64(),
        gpu_temp: parsed["gpu_temp"].as_f64(),
        disk_temp: parsed["disk_temp"].as_f64(),
        source: parsed["source"]
            .as_str()
            .unwrap_or("unknown")
            .to_string(),
    })
}

#[tauri::command]
pub async fn get_smart_data() -> Result<SmartData, String> {
    // Try smartctl first (requires smartmontools installed)
    let script = r#"
$smartctl = 'C:\Program Files\smartmontools\bin\smartctl.exe'
if (-not (Test-Path $smartctl)) {
    $smartctl = (Get-Command smartctl -ErrorAction SilentlyContinue).Source
}
if ($smartctl -and (Test-Path $smartctl)) {
    $output = & $smartctl -a C: -j 2>$null
    if ($LASTEXITCODE -le 2) {
        $output -join ''
    } else {
        '{"available": false}'
    }
} else {
    '{"available": false}'
}
"#;

    let result = powershell::run_ps(script)?;
    let output = result.stdout.trim();

    if output.is_empty() || output.contains("\"available\": false") {
        return Ok(SmartData {
            status: "No disponible".to_string(),
            power_on_hours: None,
            power_cycles: None,
            temperature: None,
            data_written_tb: None,
            data_read_tb: None,
            model: String::new(),
            serial: String::new(),
            firmware: String::new(),
            attributes: vec![],
            available: false,
        });
    }

    let parsed: serde_json::Value =
        serde_json::from_str(output).unwrap_or(serde_json::Value::Null);

    if parsed.is_null() {
        return Ok(SmartData {
            status: "Error al leer datos".to_string(),
            power_on_hours: None,
            power_cycles: None,
            temperature: None,
            data_written_tb: None,
            data_read_tb: None,
            model: String::new(),
            serial: String::new(),
            firmware: String::new(),
            attributes: vec![],
            available: false,
        });
    }

    let smart_status = parsed["smart_status"]["passed"]
        .as_bool()
        .map(|b| {
            if b {
                "Saludable"
            } else {
                "Advertencia"
            }
        })
        .unwrap_or("Desconocido");

    let mut attributes = Vec::new();
    if let Some(table) = parsed["ata_smart_attributes"]["table"].as_array() {
        for attr in table {
            attributes.push(SmartAttribute {
                id: attr["id"].as_u64().unwrap_or(0) as u32,
                name: attr["name"].as_str().unwrap_or("").to_string(),
                value: attr["value"].as_u64().unwrap_or(0).to_string(),
                worst: attr["worst"].as_u64().unwrap_or(0).to_string(),
                threshold: attr["thresh"].as_u64().unwrap_or(0).to_string(),
                raw: attr["raw"]["string"]
                    .as_str()
                    .unwrap_or("")
                    .to_string(),
            });
        }
    }

    Ok(SmartData {
        status: smart_status.to_string(),
        power_on_hours: parsed["power_on_time"]["hours"].as_u64(),
        power_cycles: parsed["power_cycle_count"].as_u64(),
        temperature: parsed["temperature"]["current"].as_u64().map(|v| v as u32),
        data_written_tb: None,
        data_read_tb: None,
        model: parsed["model_name"]
            .as_str()
            .unwrap_or("")
            .to_string(),
        serial: parsed["serial_number"]
            .as_str()
            .unwrap_or("")
            .to_string(),
        firmware: parsed["firmware_version"]
            .as_str()
            .unwrap_or("")
            .to_string(),
        attributes,
        available: true,
    })
}

#[tauri::command]
pub async fn get_battery_health() -> Result<BatteryHealth, String> {
    let script = r#"
$battery = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue
if ($battery) {
    $report = & powercfg /batteryreport /output "$env:TEMP\battery_report.xml" /xml 2>$null
    $designCap = 0
    $fullChargeCap = 0
    $cycleCount = $null

    if (Test-Path "$env:TEMP\battery_report.xml") {
        [xml]$xml = Get-Content "$env:TEMP\battery_report.xml"
        $batteries = $xml.BatteryReport.Batteries.Battery
        if ($batteries) {
            $b = if ($batteries -is [array]) { $batteries[0] } else { $batteries }
            $designCap = [uint64]$b.DesignCapacity
            $fullChargeCap = [uint64]$b.FullChargeCapacity
            $cycleCount = if ($b.CycleCount) { [uint64]$b.CycleCount } else { $null }
        }
        Remove-Item "$env:TEMP\battery_report.xml" -Force -ErrorAction SilentlyContinue
    }

    @{
        design_capacity_mwh = $designCap
        full_charge_capacity_mwh = $fullChargeCap
        health_percent = if ($designCap -gt 0) { [math]::Round(($fullChargeCap / $designCap) * 100, 1) } else { 0 }
        cycle_count = $cycleCount
        available = $true
    } | ConvertTo-Json -Compress
} else {
    @{ design_capacity_mwh = 0; full_charge_capacity_mwh = 0; health_percent = 0; cycle_count = $null; available = $false } | ConvertTo-Json -Compress
}
"#;

    let result = powershell::run_ps(script)?;
    let parsed: serde_json::Value =
        serde_json::from_str(result.stdout.trim()).map_err(|e| e.to_string())?;

    Ok(BatteryHealth {
        design_capacity_mwh: parsed["design_capacity_mwh"].as_u64().unwrap_or(0),
        full_charge_capacity_mwh: parsed["full_charge_capacity_mwh"]
            .as_u64()
            .unwrap_or(0),
        health_percent: parsed["health_percent"].as_f64().unwrap_or(0.0),
        cycle_count: parsed["cycle_count"].as_u64(),
        available: parsed["available"].as_bool().unwrap_or(false),
    })
}
