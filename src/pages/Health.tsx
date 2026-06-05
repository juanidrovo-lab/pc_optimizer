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

export default function Health() {
  const [cpuTemp, setCpuTemp] = useState<DataPoint[]>([]);
  const [gpuTemp, setGpuTemp] = useState<DataPoint[]>([]);
  const [diskRead, setDiskRead] = useState<DataPoint[]>([]);
  const [diskWrite, setDiskWrite] = useState<DataPoint[]>([]);

  const update = useCallback(() => {
    const t = ts();
    const ct = 45 + Math.random() * 20;
    const gt = 38 + Math.random() * 15;
    const dr = Math.random() * 150;
    const dw = Math.random() * 80;

    setCpuTemp((p) => [...p, { time: t, value: ct }].slice(-MAX_POINTS));
    setGpuTemp((p) => [...p, { time: t, value: gt }].slice(-MAX_POINTS));
    setDiskRead((p) => [...p, { time: t, value: dr }].slice(-MAX_POINTS));
    setDiskWrite((p) => [...p, { time: t, value: dw }].slice(-MAX_POINTS));
  }, []);

  useEffect(() => {
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [update]);

  const latestCpuT = cpuTemp.length > 0 ? cpuTemp[cpuTemp.length - 1].value : 0;
  const latestGpuT = gpuTemp.length > 0 ? gpuTemp[gpuTemp.length - 1].value : 0;

  return (
    <div className={styles.page}>
      <SectionHeader
        title="Salud del Sistema"
        subtitle="Temperaturas, SMART, velocidad de disco y batería"
      />

      <div className={styles.section}>
        <div className={styles.sectionTitle}>TEMPERATURAS</div>
        <div className={styles.tempGrid}>
          <MetricCard
            label="CPU"
            value={latestCpuT.toFixed(0)}
            unit="°C"
            status={latestCpuT > 85 ? "critical" : latestCpuT > 70 ? "warn" : "ok"}
            secondary="i5-1035G1"
          />
          <MetricCard
            label="GPU"
            value={latestGpuT.toFixed(0)}
            unit="°C"
            status={latestGpuT > 85 ? "critical" : latestGpuT > 70 ? "warn" : "ok"}
            secondary="MX110"
          />
        </div>
        <div className={styles.chartRow}>
          <RealtimeChart
            data={cpuTemp}
            label="Temperatura CPU"
            unit="°C"
            color="#ff6b35"
            maxY={100}
          />
          <RealtimeChart
            data={gpuTemp}
            label="Temperatura GPU"
            unit="°C"
            color="#ff3366"
            maxY={100}
          />
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>DISCO</div>
        <div className={styles.chartRow}>
          <RealtimeChart
            data={diskRead}
            label="Lectura"
            unit=" MB/s"
            color="#00bfff"
            maxY={500}
          />
          <RealtimeChart
            data={diskWrite}
            label="Escritura"
            unit=" MB/s"
            color="#9b59b6"
            maxY={500}
          />
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>SMART</div>
        <div className={styles.smartGrid}>
          <div className={styles.smartRow}>
            <span className={styles.smartLabel}>Estado general</span>
            <span className={styles.smartValue} style={{ color: "var(--accent)" }}>
              SALUDABLE
            </span>
          </div>
          <div className={styles.smartRow}>
            <span className={styles.smartLabel}>Horas encendido</span>
            <span className={styles.smartValue}>4,231 h</span>
          </div>
          <div className={styles.smartRow}>
            <span className={styles.smartLabel}>Ciclos de encendido</span>
            <span className={styles.smartValue}>1,847</span>
          </div>
          <div className={styles.smartRow}>
            <span className={styles.smartLabel}>Temperatura</span>
            <span className={styles.smartValue}>34 °C</span>
          </div>
          <div className={styles.smartRow}>
            <span className={styles.smartLabel}>Datos escritos</span>
            <span className={styles.smartValue}>12.4 TB</span>
          </div>
        </div>
        <div className={styles.smartNote}>
          Datos via smartctl · Requiere smartmontools instalado
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>BATERÍA</div>
        <div className={styles.batteryGrid}>
          <MetricCard label="Capacidad actual" value="38,400" unit="mWh" />
          <MetricCard label="Capacidad de diseño" value="42,000" unit="mWh" />
          <MetricCard
            label="Salud"
            value="91.4"
            unit="%"
            status="ok"
            secondary="Degradación normal"
          />
        </div>
      </div>
    </div>
  );
}
