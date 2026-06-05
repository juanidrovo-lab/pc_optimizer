import { useState, useEffect, useCallback } from "react";
import SectionHeader from "../components/SectionHeader";
import MetricCard from "../components/MetricCard";
import RealtimeChart from "../components/RealtimeChart";
import styles from "./Dashboard.module.css";

interface DataPoint {
  time: string;
  value: number;
}

function generateTimestamp(): string {
  const d = new Date();
  return `${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

const MAX_POINTS = 60;

export default function Dashboard() {
  const [cpuData, setCpuData] = useState<DataPoint[]>([]);
  const [ramData, setRamData] = useState<DataPoint[]>([]);
  const [diskData, setDiskData] = useState<DataPoint[]>([]);

  const [cpuUsage, setCpuUsage] = useState(0);
  const [ramUsed, setRamUsed] = useState(0);
  const [ramTotal, setRamTotal] = useState(0);
  const [diskUsed, setDiskUsed] = useState(0);
  const [diskTotal, setDiskTotal] = useState(0);
  const [uptime, setUptime] = useState("");

  const updateMetrics = useCallback(() => {
    // Simulated data — will be replaced by Tauri invoke in step 4
    const cpu = 15 + Math.random() * 30;
    const ram = 5500 + Math.random() * 2000;
    const rTotal = 12288;
    const dUsed = 98.5 + Math.random() * 0.5;
    const dTotal = 238.5;
    const ts = generateTimestamp();

    setCpuUsage(cpu);
    setRamUsed(ram);
    setRamTotal(rTotal);
    setDiskUsed(dUsed);
    setDiskTotal(dTotal);
    setUptime("3d 14h 22m");

    setCpuData((prev) => {
      const next = [...prev, { time: ts, value: cpu }];
      return next.slice(-MAX_POINTS);
    });
    setRamData((prev) => {
      const next = [...prev, { time: ts, value: (ram / rTotal) * 100 }];
      return next.slice(-MAX_POINTS);
    });
    setDiskData((prev) => {
      const next = [...prev, { time: ts, value: (dUsed / dTotal) * 100 }];
      return next.slice(-MAX_POINTS);
    });
  }, []);

  useEffect(() => {
    updateMetrics();
    const interval = setInterval(updateMetrics, 1000);
    return () => clearInterval(interval);
  }, [updateMetrics]);

  const ramPercent = ramTotal > 0 ? (ramUsed / ramTotal) * 100 : 0;
  const diskPercent = diskTotal > 0 ? (diskUsed / diskTotal) * 100 : 0;

  return (
    <div className={styles.page}>
      <SectionHeader
        title="Panel de Control"
        subtitle="Monitoreo del sistema en tiempo real"
      />

      <div className={styles.metricsRow}>
        <MetricCard
          label="CPU"
          value={cpuUsage.toFixed(1)}
          unit="%"
          status={cpuUsage > 90 ? "critical" : cpuUsage > 70 ? "warn" : "ok"}
          secondary="i5-1035G1"
        />
        <MetricCard
          label="RAM"
          value={(ramUsed / 1024).toFixed(1)}
          unit={`/ ${(ramTotal / 1024).toFixed(0)} GB`}
          status={ramPercent > 90 ? "critical" : ramPercent > 75 ? "warn" : "ok"}
          secondary={`${ramPercent.toFixed(0)}% utilizado`}
        />
        <MetricCard
          label="Disco"
          value={diskUsed.toFixed(1)}
          unit={`/ ${diskTotal.toFixed(0)} GB`}
          status={diskPercent > 90 ? "critical" : diskPercent > 75 ? "warn" : "ok"}
          secondary={`${diskPercent.toFixed(0)}% utilizado`}
        />
        <MetricCard
          label="Uptime"
          value={uptime}
          status="ok"
        />
      </div>

      <div className={styles.chartsGrid}>
        <RealtimeChart data={cpuData} label="Uso de CPU" unit="%" color="#39ff14" />
        <RealtimeChart
          data={ramData}
          label="Uso de RAM"
          unit="%"
          color="#00bfff"
        />
        <RealtimeChart
          data={diskData}
          label="Uso de Disco"
          unit="%"
          color="#ffb800"
        />
      </div>

      <div className={styles.statusBar}>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>ESTADO</span>
          <span className={styles.statusValue} style={{ color: "var(--accent)" }}>
            ● OPERATIVO
          </span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>ÚLTIMO SCAN</span>
          <span className={styles.statusValue}>—</span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>ESPACIO RECUPERABLE</span>
          <span className={styles.statusValue}>Ejecutar limpieza →</span>
        </div>
      </div>
    </div>
  );
}
