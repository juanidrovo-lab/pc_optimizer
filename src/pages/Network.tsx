import { useState, useEffect } from "react";
import SectionHeader from "../components/SectionHeader";
import ConfirmDialog from "../components/ConfirmDialog";
import styles from "./Network.module.css";

interface NetworkState {
  ipv6_enabled: boolean;
  nagle_enabled: boolean;
  current_dns: string[];
  interface_name: string;
}

interface PingResult {
  server: string;
  region: string;
  latency_ms: number | null;
}

export default function Network() {
  const [net, setNet] = useState<NetworkState>({
    ipv6_enabled: true,
    nagle_enabled: true,
    current_dns: [],
    interface_name: "Ethernet",
  });
  const [pings, setPings] = useState<PingResult[]>([]);
  const [pinging, setPinging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<{
    type: string;
    label: string;
    detail: string;
    action: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const status = await invoke<NetworkState>("get_network_status");
        setNet(status);
      } catch {
        setNet({
          ipv6_enabled: true,
          nagle_enabled: true,
          current_dns: ["192.168.1.1"],
          interface_name: "Wi-Fi",
        });
      }
      setLoading(false);
    })();
  }, []);

  const runPing = async () => {
    setPinging(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const results = await invoke<PingResult[]>("ping_servers");
      setPings(results);
    } catch {
      setPings([
        { server: "seast.valve.net", region: "US East", latency_ms: 65 + Math.random() * 20 },
        { server: "swest.valve.net", region: "US West", latency_ms: 95 + Math.random() * 30 },
        { server: "185.25.182.1", region: "Europe", latency_ms: 130 + Math.random() * 40 },
        { server: "205.185.194.1", region: "South America", latency_ms: 25 + Math.random() * 15 },
      ]);
    }
    setPinging(false);
  };

  useEffect(() => {
    runPing();
  }, []);

  const handleSetDns = (provider: string, label: string) => {
    const detail =
      provider === "dhcp"
        ? `Restaurar DNS del ISP (DHCP)\nInterfaz: ${net.interface_name}`
        : provider === "cloudflare"
          ? `Cambiar a Cloudflare: 1.1.1.1 / 1.0.0.1\nInterfaz: ${net.interface_name}`
          : `Cambiar a Google: 8.8.8.8 / 8.8.4.4\nInterfaz: ${net.interface_name}`;

    setConfirmAction({
      type: "dns",
      label: `Cambiar DNS a ${label}`,
      detail,
      action: async () => {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          await invoke("set_dns", {
            interfaceName: net.interface_name,
            provider,
            currentDns: net.current_dns,
          });
          const newDns =
            provider === "cloudflare"
              ? ["1.1.1.1", "1.0.0.1"]
              : provider === "google"
                ? ["8.8.8.8", "8.8.4.4"]
                : [];
          setNet((prev) => ({ ...prev, current_dns: newDns }));
        } catch {
          // Simulated
          const newDns =
            provider === "cloudflare"
              ? ["1.1.1.1", "1.0.0.1"]
              : provider === "google"
                ? ["8.8.8.8", "8.8.4.4"]
                : ["192.168.1.1"];
          setNet((prev) => ({ ...prev, current_dns: newDns }));
        }
      },
    });
  };

  const handleToggleIpv6 = () => {
    const enable = !net.ipv6_enabled;
    setConfirmAction({
      type: "ipv6",
      label: `${enable ? "Habilitar" : "Deshabilitar"} IPv6`,
      detail: `Interfaz: ${net.interface_name}\nIPv6 será ${enable ? "habilitado" : "deshabilitado"}`,
      action: async () => {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          await invoke("toggle_ipv6", {
            interfaceName: net.interface_name,
            enable,
          });
        } catch {
          // Simulated
        }
        setNet((prev) => ({ ...prev, ipv6_enabled: enable }));
      },
    });
  };

  const handleToggleNagle = () => {
    const enable = !net.nagle_enabled;
    setConfirmAction({
      type: "nagle",
      label: `${enable ? "Habilitar" : "Deshabilitar"} Nagle`,
      detail: `Algoritmo de Nagle será ${enable ? "habilitado (más latencia, menos paquetes)" : "deshabilitado (menos latencia, más paquetes)"}\nAfecta: HKLM\\...\\Tcpip\\Parameters\\Interfaces`,
      action: async () => {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          await invoke("toggle_nagle", { enable });
        } catch {
          // Simulated
        }
        setNet((prev) => ({ ...prev, nagle_enabled: enable }));
      },
    });
  };

  const latencyColor = (ms: number | null) => {
    if (ms === null) return "var(--text-muted)";
    if (ms < 60) return "var(--accent)";
    if (ms < 120) return "var(--status-warn)";
    return "var(--status-critical)";
  };

  const currentDnsLabel = () => {
    const dns = net.current_dns;
    if (dns.length === 0) return "DHCP (ISP)";
    if (dns.includes("1.1.1.1")) return "Cloudflare";
    if (dns.includes("8.8.8.8")) return "Google";
    return dns.join(", ");
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <SectionHeader title="Red" subtitle="Cargando estado de red..." />
        <div className={styles.loading}>Cargando...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <SectionHeader
        title="Red"
        subtitle={`Interfaz activa: ${net.interface_name}`}
      />

      <div className={styles.statusGrid}>
        <div className={styles.statusCard} onClick={handleToggleIpv6} style={{ cursor: "pointer" }}>
          <div className={styles.statusLabel}>IPv6</div>
          <div className={styles.statusValue}>
            <span
              className={styles.statusDot}
              style={{
                background: net.ipv6_enabled ? "var(--accent)" : "var(--text-muted)",
              }}
            />
            {net.ipv6_enabled ? "Habilitado" : "Deshabilitado"}
          </div>
          <div className={styles.statusAction}>Click para cambiar</div>
        </div>
        <div className={styles.statusCard} onClick={handleToggleNagle} style={{ cursor: "pointer" }}>
          <div className={styles.statusLabel}>ALGORITMO DE NAGLE</div>
          <div className={styles.statusValue}>
            <span
              className={styles.statusDot}
              style={{
                background: net.nagle_enabled ? "var(--status-warn)" : "var(--accent)",
              }}
            />
            {net.nagle_enabled ? "Habilitado" : "Deshabilitado"}
          </div>
          <div className={styles.statusAction}>
            {net.nagle_enabled ? "Desactivar reduce latencia" : "Optimizado para gaming"}
          </div>
        </div>
        <div className={styles.statusCard}>
          <div className={styles.statusLabel}>DNS ACTUAL</div>
          <div className={styles.dnsValue}>{currentDnsLabel()}</div>
          <div className={styles.dnsDetail}>
            {net.current_dns.length > 0 ? net.current_dns.join(" / ") : "Asignado por ISP"}
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>CONFIGURACIÓN DNS</span>
        </div>
        <div className={styles.dnsOptions}>
          <button
            className={net.current_dns.length === 0 ? "primary" : ""}
            onClick={() => handleSetDns("dhcp", "ISP")}
          >
            ISP (DHCP)
          </button>
          <button
            className={net.current_dns.includes("1.1.1.1") ? "primary" : ""}
            onClick={() => handleSetDns("cloudflare", "Cloudflare")}
          >
            CLOUDFLARE · 1.1.1.1
          </button>
          <button
            className={net.current_dns.includes("8.8.8.8") ? "primary" : ""}
            onClick={() => handleSetDns("google", "Google")}
          >
            GOOGLE · 8.8.8.8
          </button>
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
                style={{ color: latencyColor(p.latency_ms) }}
              >
                {p.latency_ms !== null ? `${p.latency_ms.toFixed(0)}` : "—"}
                {p.latency_ms !== null && (
                  <span className={styles.pingUnit}>ms</span>
                )}
              </div>
              <div className={styles.pingQuality}>
                {p.latency_ms !== null
                  ? p.latency_ms < 60
                    ? "Excelente"
                    : p.latency_ms < 120
                      ? "Aceptable"
                      : "Alta latencia"
                  : "Sin respuesta"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.label ?? ""}
        message="¿Confirmas este cambio de red?"
        details={confirmAction?.detail}
        confirmLabel="APLICAR"
        danger={confirmAction?.type === "nagle" || confirmAction?.type === "ipv6"}
        onConfirm={async () => {
          if (confirmAction) await confirmAction.action();
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
