import { useState, useEffect, useCallback } from "react";
import SectionHeader from "../components/SectionHeader";
import MetricCard from "../components/MetricCard";
import RealtimeChart from "../components/RealtimeChart";
import styles from "./Health.module.css";

interface DataPoint {
  time: string;
  value: number;
}

const MAX_POINTS = 60;

function ts(): string {
  const d = new Date();
  return `${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface SmartRow {
  label: string;
  value: string;
  color?: string;
}

export default function Health() {
  const [cpuData, setCpuData] = useState<DataPoint[]>([]);
  const [ramData, setRamData] = useState<DataPoint[]>([]);
  const [cpuTempData, setCpuTempData] = useState<DataPoint[]>([]);
  const [gpuTempData, setGpuTempData] = useState<DataPoint[]>([]);
  const [diskReadData, setDiskReadData] = useState<DataPoint[]>([]);
  const [diskWriteData, setDiskWriteData] = useState<DataPoint[]>([]);

  const [cpuUsage, setCpuUsage] = useState(0);
  const [cpuName, setCpuName] = useState("—");
  const [cpuCores, setCpuCores] = useState(0);
  const [cpuThreads, setCpuThreads] = useState(0);
  const [ramUsed, setRamUsed] = useState(0);
  const [ramTotal, setRamTotal] = useState(0);
  const [diskUsed, setDiskUsed] = useState(0);
  const [diskTotal, setDiskTotal] = useState(0);
  const [diskFree, setDiskFree] = useState(0);
  const [uptime, setUptime] = useState(0);
  const [gpuName, setGpuName] = useState("—");

  const [cpuTemp, setCpuTemp] = useState<number | null>(null);
  const [gpuTemp, setGpuTemp] = useState<number | null>(null);
  const [tempSource, setTempSource] = useState("—");

  const [smartData, setSmartData] = useState<SmartRow[]>([]);
  const [smartAvailable, setSmartAvailable] = useState(false);
  const [smartModel, setSmartModel] = useState("");

  const [batteryHealth, setBatteryHealth] = useState(0);
  const [batteryDesign, setBatteryDesign] = useState(0);
  const [batteryFull, setBatteryFull] = useState(0);
  const [batteryAvailable, setBatteryAvailable] = useState(false);

  const updateMetrics = useCallback(async () => {
    const t = ts();

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const health = await invoke<{
        cpu_usage: number;
        cpu_name: string;
        cpu_cores: number;
        cpu_threads: number;
        ram_total_mb: number;
        ram_used_mb: number;
        disk_total_gb: number;
        disk_used_gb: number;
        disk_free_gb: number;
        disk_read_speed: number;
        disk_write_speed: number;
        uptime_seconds: number;
        gpu_name: string;
      }>("get_system_health");

      setCpuUsage(health.cpu_usage);
      setCpuName(health.cpu_name);
      setCpuCores(health.cpu_cores);
      setCpuThreads(health.cpu_threads);
      setRamUsed(health.ram_used_mb);
      setRamTotal(health.ram_total_mb);
      setDiskUsed(health.disk_used_gb);
      setDiskTotal(health.disk_total_gb);
      setDiskFree(health.disk_free_gb);
      setUptime(health.uptime_seconds);
      setGpuName(health.gpu_name);

      setCpuData((p) => [...p, { time: t, value: health.cpu_usage }].slice(-MAX_POINTS));
      setRamData((p) => [
        ...p,
        { time: t, value: (health.ram_used_mb / health.ram_total_mb) * 100 },
      ].slice(-MAX_POINTS));
      setDiskReadData((p) => [...p, { time: t, value: health.disk_read_speed }].slice(-MAX_POINTS));
      setDiskWriteData((p) => [...p, { time: t, value: health.disk_write_speed }].slice(-MAX_POINTS));
      return;
    } catch {
      // Fallback to simulated data
    }

    const cpu = 15 + Math.random() * 30;
    const ram = 5500 + Math.random() * 2000;
    const ct = 45 + Math.random() * 20;
    const gt = 38 + Math.random() * 15;
    const dr = Math.random() * 150;
    const dw = Math.random() * 80;

    setCpuUsage(cpu);
    setCpuName("Intel Core i5-1035G1");
    setCpuCores(4);
    setCpuThreads(8);
    setRamUsed(ram);
    setRamTotal(12288);
    setDiskUsed(98.5);
    setDiskTotal(238.5);
    setDiskFree(140);
    setUptime(302520);
    setGpuName("NVIDIA GeForce MX110");
    setCpuTemp(ct);
    setGpuTemp(gt);
    setTempSource("Simulado");

    setCpuData((p) => [...p, { time: t, value: cpu }].slice(-MAX_POINTS));
    setRamData((p) => [...p, { time: t, value: (ram / 12288) * 100 }].slice(-MAX_POINTS));
    setCpuTempData((p) => [...p, { time: t, value: ct }].slice(-MAX_POINTS));
    setGpuTempData((p) => [...p, { time: t, value: gt }].slice(-MAX_POINTS));
    setDiskReadData((p) => [...p, { time: t, value: dr }].slice(-MAX_POINTS));
    setDiskWriteData((p) => [...p, { time: t, value: dw }].slice(-MAX_POINTS));
  }, []);

  useEffect(() => {
    updateMetrics();
    const iv = setInterval(updateMetrics, 2000);
    return () => clearInterval(iv);
  }, [updateMetrics]);

  // Load static data once
  useEffect(() => {
    (async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");

        const temps = await invoke<{ cpu_temp: number | null; gpu_temp: number | null; source: string }>("get_temperatures");
        setCpuTemp(temps.cpu_temp);
        setGpuTemp(temps.gpu_temp);
        setTempSource(temps.source);

        const smart = await invoke<{
          status: string;
          power_on_hours: number | null;
          power_cycles: number | null;
          temperature: number | null;
          model: string;
          available: boolean;
          data_written_tb: number | null;
        }>("get_smart_data");
        setSmartAvailable(smart.available);

        setSmartModel(smart.model);
        if (smart.available) {
          const rows: SmartRow[] = [];
          rows.push({ label: "Estado general", value: smart.status, color: smart.status === "Saludable" ? "var(--accent)" : "var(--status-warn)" });
          if (smart.power_on_hours !== null) rows.push({ label: "Horas encendido", value: `${smart.power_on_hours.toLocaleString()} h` });
          if (smart.power_cycles !== null) rows.push({ label: "Ciclos de encendido", value: smart.power_cycles.toLocaleString() });
          if (smart.temperature !== null) rows.push({ label: "Temperatura", value: `${smart.temperature} °C` });
          if (smart.data_written_tb !== null) rows.push({ label: "Datos escritos", value: `${smart.data_written_tb.toFixed(1)} TB` });
          setSmartData(rows);
        }

        const battery = await invoke<{
          design_capacity_mwh: number;
          full_charge_capacity_mwh: number;
          health_percent: number;
          available: boolean;
        }>("get_battery_health");
        setBatteryAvailable(battery.available);
        setBatteryDesign(battery.design_capacity_mwh);
        setBatteryFull(battery.full_charge_capacity_mwh);
        setBatteryHealth(battery.health_percent);
      } catch {
        // Simulated static data
        setSmartAvailable(true);
        setSmartModel("Samsung SSD 860 EVO");
        setSmartData([
          { label: "Estado general", value: "SALUDABLE", color: "var(--accent)" },
          { label: "Horas encendido", value: "4,231 h" },
          { label: "Ciclos de encendido", value: "1,847" },
          { label: "Temperatura", value: "34 °C" },
          { label: "Datos escritos", value: "12.4 TB" },
        ]);
        setBatteryAvailable(true);
        setBatteryDesign(42000);
        setBatteryFull(38400);
        setBatteryHealth(91.4);
      }
    })();
  }, []);

  const ramPercent = ramTotal > 0 ? (ramUsed / ramTotal) * 100 : 0;
  const diskPercent = diskTotal > 0 ? (diskUsed / diskTotal) * 100 : 0;

  return (
    <div className={styles.page}>
      <SectionHeader
        title="Salud del Sistema"
        subtitle="Métricas en tiempo real · Temperaturas · SMART · Batería"
      />

      <div className={styles.section}>
        <div className={styles.sectionTitle}>SISTEMA</div>
        <div className={styles.metricsRow}>
          <MetricCard
            label="CPU"
            value={cpuUsage.toFixed(1)}
            unit="%"
            status={cpuUsage > 90 ? "critical" : cpuUsage > 70 ? "warn" : "ok"}
            secondary={`${cpuName} · ${cpuCores}C/${cpuThreads}T`}
          />
          <MetricCard
            label="RAM"
            value={(ramUsed / 1024).toFixed(1)}
            unit={`/ ${(ramTotal / 1024).toFixed(0)} GB`}
            status={ramPercent > 90 ? "critical" : ramPercent > 75 ? "warn" : "ok"}
            secondary={`${ramPercent.toFixed(0)}% utilizado`}
          />
          <MetricCard
            label="Disco C:"
            value={diskUsed.toFixed(1)}
            unit={`/ ${diskTotal.toFixed(0)} GB`}
            status={diskPercent > 90 ? "critical" : diskPercent > 75 ? "warn" : "ok"}
            secondary={`${diskFree.toFixed(1)} GB libres`}
          />
          <MetricCard label="GPU" value={gpuName} status="ok" />
          <MetricCard
            label="Uptime"
            value={formatUptime(uptime)}
            status="ok"
          />
        </div>
        <div className={styles.chartRow}>
          <RealtimeChart data={cpuData} label="Uso de CPU" unit="%" color="#39ff14" />
          <RealtimeChart data={ramData} label="Uso de RAM" unit="%" color="#00bfff" />
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>TEMPERATURAS · {tempSource.toUpperCase()}</div>
        <div className={styles.tempRow}>
          <MetricCard
            label="CPU"
            value={cpuTemp !== null ? cpuTemp.toFixed(0) : "—"}
            unit="°C"
            status={
              cpuTemp !== null
                ? cpuTemp > 85 ? "critical" : cpuTemp > 70 ? "warn" : "ok"
                : "ok"
            }
            secondary={cpuName}
          />
          <MetricCard
            label="GPU"
            value={gpuTemp !== null ? gpuTemp.toFixed(0) : "—"}
            unit="°C"
            status={
              gpuTemp !== null
                ? gpuTemp > 85 ? "critical" : gpuTemp > 70 ? "warn" : "ok"
                : "ok"
            }
            secondary={gpuName}
          />
        </div>
        <div className={styles.chartRow}>
          <RealtimeChart
            data={cpuTempData}
            label="Temperatura CPU"
            unit="°C"
            color="#ff6b35"
            maxY={100}
          />
          <RealtimeChart
            data={gpuTempData}
            label="Temperatura GPU"
            unit="°C"
            color="#ff3366"
            maxY={100}
          />
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>DISCO · VELOCIDAD</div>
        <div className={styles.chartRow}>
          <RealtimeChart
            data={diskReadData}
            label="Lectura"
            unit=" MB/s"
            color="#00bfff"
            maxY={500}
          />
          <RealtimeChart
            data={diskWriteData}
            label="Escritura"
            unit=" MB/s"
            color="#9b59b6"
            maxY={500}
          />
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          SMART {smartModel && `· ${smartModel}`}
        </div>
        {smartAvailable ? (
          <div className={styles.smartGrid}>
            {smartData.map((row, i) => (
              <div key={i} className={styles.smartRow}>
                <span className={styles.smartLabel}>{row.label}</span>
                <span
                  className={styles.smartValue}
                  style={row.color ? { color: row.color } : undefined}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.smartUnavailable}>
            smartmontools no está instalado · Instala smartmontools para ver datos SMART detallados
          </div>
        )}
      </div>

      {batteryAvailable && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>BATERÍA</div>
          <div className={styles.batteryGrid}>
            <MetricCard
              label="Capacidad actual"
              value={batteryFull.toLocaleString()}
              unit="mWh"
            />
            <MetricCard
              label="Capacidad de diseño"
              value={batteryDesign.toLocaleString()}
              unit="mWh"
            />
            <MetricCard
              label="Salud"
              value={batteryHealth.toFixed(1)}
              unit="%"
              status={
                batteryHealth > 80 ? "ok" : batteryHealth > 50 ? "warn" : "critical"
              }
              secondary={
                batteryHealth > 90
                  ? "Excelente estado"
                  : batteryHealth > 80
                    ? "Degradación normal"
                    : "Considerar reemplazo"
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
