import { useState, useEffect, useCallback } from "react";
import SectionHeader from "../components/SectionHeader";
import styles from "./Network.module.css";

interface PingResult {
  server: string;
  region: string;
  latency: number | null;
}

const DOTA_SERVERS: PingResult[] = [
  { server: "seast.valve.net", region: "US East", latency: null },
  { server: "swest.valve.net", region: "US West", latency: null },
  { server: "seu.valve.net", region: "Europe", latency: null },
  { server: "ssouth.valve.net", region: "South America", latency: null },
];

export default function Network() {
  const [pings, setPings] = useState<PingResult[]>(DOTA_SERVERS);
  const [pinging, setPinging] = useState(false);

  const runPing = useCallback(async () => {
    setPinging(true);
    // Simulated — will use Tauri invoke in step 5
    await new Promise((r) => setTimeout(r, 1200));
    setPings(
      DOTA_SERVERS.map((s) => ({
        ...s,
        latency: 20 + Math.random() * 150,
      }))
    );
    setPinging(false);
  }, []);

  useEffect(() => {
    runPing();
  }, [runPing]);

  const latencyColor = (ms: number | null) => {
    if (ms === null) return "var(--text-muted)";
    if (ms < 60) return "var(--accent)";
    if (ms < 120) return "var(--status-warn)";
    return "var(--status-critical)";
  };

  return (
    <div className={styles.page}>
      <SectionHeader
        title="Red"
        subtitle="Estado de red, DNS y latencia a servidores de juego"
      />

      <div className={styles.statusGrid}>
        <div className={styles.statusCard}>
          <div className={styles.statusLabel}>IPv6</div>
          <div className={styles.statusValue}>
            <span className={styles.statusDot} style={{ background: "var(--accent)" }} />
            Habilitado
          </div>
        </div>
        <div className={styles.statusCard}>
          <div className={styles.statusLabel}>ALGORITMO DE NAGLE</div>
          <div className={styles.statusValue}>
            <span className={styles.statusDot} style={{ background: "var(--status-warn)" }} />
            Habilitado
          </div>
        </div>
        <div className={styles.statusCard}>
          <div className={styles.statusLabel}>DNS ACTUAL</div>
          <div className={styles.dnsValue}>192.168.1.1</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>CONFIGURACIÓN DNS</span>
        </div>
        <div className={styles.dnsOptions}>
          <button>ISP (ACTUAL)</button>
          <button className="primary">CLOUDFLARE · 1.1.1.1</button>
          <button>GOOGLE · 8.8.8.8</button>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>LATENCIA · DOTA 2</span>
          <button onClick={runPing} disabled={pinging}>
            {pinging ? "MIDIENDO..." : "ACTUALIZAR"}
          </button>
        </div>
        <div className={styles.pingGrid}>
          {pings.map((p) => (
            <div key={p.region} className={styles.pingCard}>
              <div className={styles.pingRegion}>{p.region}</div>
              <div className={styles.pingServer}>{p.server}</div>
              <div
                className={styles.pingLatency}
                style={{ color: latencyColor(p.latency) }}
              >
                {p.latency !== null ? `${p.latency.toFixed(0)} ms` : "—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
