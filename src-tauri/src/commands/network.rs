use crate::db::Database;
use crate::utils::powershell;
use serde::Serialize;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct NetworkStatus {
    pub ipv6_enabled: bool,
    pub nagle_enabled: bool,
    pub current_dns: Vec<String>,
    pub interface_name: String,
}

#[derive(Debug, Serialize)]
pub struct PingResult {
    pub server: String,
    pub region: String,
    pub latency_ms: Option<f64>,
}

#[tauri::command]
pub async fn get_network_status() -> Result<NetworkStatus, String> {
    let script = r#"
$adapter = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1
$ifName = if ($adapter) { $adapter.Name } else { 'Ethernet' }

$ipv6 = $false
if ($adapter) {
    $binding = Get-NetAdapterBinding -Name $ifName -ComponentID ms_tcpip6 -ErrorAction SilentlyContinue
    $ipv6 = if ($binding) { $binding.Enabled } else { $false }
}

# Check Nagle (TcpNoDelay in registry)
$nagle = $true
$tcpParams = Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\*' -Name TcpNoDelay -ErrorAction SilentlyContinue
if ($tcpParams) {
    $noDelay = ($tcpParams | Select-Object -First 1).TcpNoDelay
    if ($noDelay -eq 1) { $nagle = $false }
}

$dns = @()
if ($adapter) {
    $dnsConfig = Get-DnsClientServerAddress -InterfaceAlias $ifName -AddressFamily IPv4 -ErrorAction SilentlyContinue
    if ($dnsConfig -and $dnsConfig.ServerAddresses) {
        $dns = $dnsConfig.ServerAddresses
    }
}

@{
    ipv6_enabled = $ipv6
    nagle_enabled = $nagle
    current_dns = $dns
    interface_name = $ifName
} | ConvertTo-Json -Compress
"#;

    let result = powershell::run_ps(script)?;
    let parsed: serde_json::Value =
        serde_json::from_str(result.stdout.trim()).map_err(|e| e.to_string())?;

    let dns = if let Some(arr) = parsed["current_dns"].as_array() {
        arr.iter()
            .filter_map(|v| v.as_str().map(String::from))
            .collect()
    } else if let Some(s) = parsed["current_dns"].as_str() {
        vec![s.to_string()]
    } else {
        vec![]
    };

    Ok(NetworkStatus {
        ipv6_enabled: parsed["ipv6_enabled"].as_bool().unwrap_or(false),
        nagle_enabled: parsed["nagle_enabled"].as_bool().unwrap_or(true),
        current_dns: dns,
        interface_name: parsed["interface_name"]
            .as_str()
            .unwrap_or("Ethernet")
            .to_string(),
    })
}

#[tauri::command]
pub async fn set_dns(
    db: State<'_, Database>,
    interface_name: String,
    provider: String,
    current_dns: Vec<String>,
) -> Result<(), String> {
    let (primary, secondary) = match provider.as_str() {
        "cloudflare" => ("1.1.1.1", "1.0.0.1"),
        "google" => ("8.8.8.8", "8.8.4.4"),
        "dhcp" => ("", ""),
        _ => return Err(format!("DNS provider desconocido: {}", provider)),
    };

    let previous = if current_dns.is_empty() {
        "DHCP".to_string()
    } else {
        current_dns.join(",")
    };

    let new_val = if provider == "dhcp" {
        "DHCP".to_string()
    } else {
        format!("{},{}", primary, secondary)
    };

    let scan_id = db.insert_scan(
        "red",
        &format!("DNS cambiado a {}", &provider),
        Some(&format!("{} → {}", &previous, &new_val)),
        0,
    )?;

    db.insert_change(
        Some(scan_id),
        "red",
        "dns",
        &interface_name,
        &previous,
        &new_val,
    )?;

    let script = if provider == "dhcp" {
        format!(
            "Set-DnsClientServerAddress -InterfaceAlias '{}' -ResetServerAddresses",
            interface_name.replace('\'', "''")
        )
    } else {
        format!(
            "Set-DnsClientServerAddress -InterfaceAlias '{}' -ServerAddresses @('{}','{}')",
            interface_name.replace('\'', "''"),
            primary,
            secondary
        )
    };

    let result = powershell::run_ps_elevated(&script)?;
    if !result.success {
        return Err(format!("Error al cambiar DNS: {}", result.stderr));
    }

    Ok(())
}

#[tauri::command]
pub async fn toggle_ipv6(
    db: State<'_, Database>,
    interface_name: String,
    enable: bool,
) -> Result<(), String> {
    let previous = if enable { "disabled" } else { "enabled" };
    let new_val = if enable { "enabled" } else { "disabled" };

    let scan_id = db.insert_scan(
        "red",
        &format!("IPv6 {}", if enable { "habilitado" } else { "deshabilitado" }),
        Some(&format!("Interfaz: {}", &interface_name)),
        0,
    )?;

    db.insert_change(
        Some(scan_id),
        "red",
        "ipv6",
        &interface_name,
        previous,
        new_val,
    )?;

    let script = if enable {
        format!(
            "Enable-NetAdapterBinding -Name '{}' -ComponentID ms_tcpip6",
            interface_name.replace('\'', "''")
        )
    } else {
        format!(
            "Disable-NetAdapterBinding -Name '{}' -ComponentID ms_tcpip6",
            interface_name.replace('\'', "''")
        )
    };

    let result = powershell::run_ps_elevated(&script)?;
    if !result.success {
        return Err(format!("Error al modificar IPv6: {}", result.stderr));
    }

    Ok(())
}

#[tauri::command]
pub async fn toggle_nagle(
    db: State<'_, Database>,
    enable: bool,
) -> Result<(), String> {
    let previous = if enable { "disabled" } else { "enabled" };
    let new_val = if enable { "enabled" } else { "disabled" };

    let scan_id = db.insert_scan(
        "red",
        &format!(
            "Algoritmo de Nagle {}",
            if enable { "habilitado" } else { "deshabilitado" }
        ),
        None,
        0,
    )?;

    db.insert_change(
        Some(scan_id),
        "red",
        "nagle",
        "HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces",
        previous,
        new_val,
    )?;

    let tcp_no_delay = if enable { 0 } else { 1 };
    let script = format!(
        r#"
Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\*' |
ForEach-Object {{
    $path = $_.PSPath
    Set-ItemProperty -Path $path -Name 'TcpNoDelay' -Value {} -Type DWord -ErrorAction SilentlyContinue
    Set-ItemProperty -Path $path -Name 'TcpAckFrequency' -Value {} -Type DWord -ErrorAction SilentlyContinue
}}
"#,
        tcp_no_delay, tcp_no_delay
    );

    let result = powershell::run_ps_elevated(&script)?;
    if !result.success {
        return Err(format!(
            "Error al modificar Nagle: {}",
            result.stderr
        ));
    }

    Ok(())
}

#[tauri::command]
pub async fn ping_servers() -> Result<Vec<PingResult>, String> {
    let servers = vec![
        ("seast.valve.net", "US East"),
        ("swest.valve.net", "US West"),
        ("185.25.182.1", "Europe"),
        ("205.185.194.1", "South America"),
    ];

    let mut results = Vec::new();

    for (server, region) in &servers {
        let script = format!(
            "$ping = Test-Connection -ComputerName '{}' -Count 3 -ErrorAction SilentlyContinue; \
             if ($ping) {{ ($ping | Measure-Object -Property Latency -Average).Average }} else {{ -1 }}",
            server
        );

        let result = powershell::run_ps(&script)?;
        let latency = result
            .stdout
            .trim()
            .parse::<f64>()
            .ok()
            .filter(|&v| v >= 0.0);

        results.push(PingResult {
            server: server.to_string(),
            region: region.to_string(),
            latency_ms: latency,
        });
    }

    Ok(results)
}
