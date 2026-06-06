import { useState, useEffect } from "react";
import SectionHeader from "../components/SectionHeader";
import ConfirmDialog from "../components/ConfirmDialog";
import styles from "./Startup.module.css";

interface StartupItem {
  name: string;
  command: string;
  location: string;
  enabled: boolean;
  user: string;
}

export default function Startup() {
  const [items, setItems] = useState<StartupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastBootMs, setLastBootMs] = useState(0);
  const [avgBootMs, setAvgBootMs] = useState(0);
  const [confirmItem, setConfirmItem] = useState<StartupItem | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const [startupItems, bootTimes] = await Promise.all([
          invoke<StartupItem[]>("get_startup_items"),
          invoke<{ last_boot_ms: number; average_boot_ms: number }>("get_boot_times"),
        ]);
        setItems(startupItems);
        setLastBootMs(bootTimes.last_boot_ms);
        setAvgBootMs(bootTimes.average_boot_ms);
      } catch {
        setItems([
          { name: "Spotify", command: "C:\\Users\\...\\Spotify.exe --minimized", location: "HKCU\\Run", enabled: true, user: "Current" },
          { name: "Discord", command: "C:\\Users\\...\\Update.exe --processStart Discord.exe", location: "HKCU\\Run", enabled: true, user: "Current" },
          { name: "OneDrive", command: "C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe /background", location: "HKLM\\Run", enabled: true, user: "All Users" },
          { name: "SecurityHealth", command: "%ProgramFiles%\\Windows Defender\\MSASCuiL.exe", location: "HKLM\\Run", enabled: true, user: "All Users" },
          { name: "RealTek Audio", command: "C:\\Program Files\\Realtek\\Audio\\HDA\\RtkNGUI64.exe -s", location: "HKLM\\Run", enabled: true, user: "All Users" },
        ]);
        setLastBootMs(24300);
        setAvgBootMs(22100);
      }
      setLoading(false);
    })();
  }, []);

  const handleToggle = async (item: StartupItem) => {
    if (item.enabled) {
      setConfirmItem(item);
    } else {
      await doToggle(item, true);
    }
  };

  const doToggle = async (item: StartupItem, enable: boolean) => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("toggle_startup_item", {
        name: item.name,
        location: item.location,
        enable,
      });
    } catch {
      // Simulated
    }
    setItems((prev) =>
      prev.map((i) =>
        i.name === item.name ? { ...i, enabled: enable } : i
      )
    );
    setConfirmItem(null);
  };

  const formatMs = (ms: number): string => {
    if (ms === 0) return "—";
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const activeCount = items.filter((i) => i.enabled).length;

  return (
    <div className={styles.page}>
      <SectionHeader
        title="Arranque"
        subtitle="Programas de inicio · Tiempo de arranque medido"
      />

      <div className={styles.info}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>ÚLTIMO ARRANQUE</span>
          <span className={styles.infoValue}>{formatMs(lastBootMs)}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>PROMEDIO HISTÓRICO</span>
          <span className={styles.infoValue}>{formatMs(avgBootMs)}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>PROGRAMAS ACTIVOS</span>
          <span className={styles.infoValue}>{activeCount}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>TOTAL</span>
          <span className={styles.infoValue}>{items.length}</span>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Cargando programas de inicio...</div>
      ) : (
        <div className={styles.list}>
          <div className={styles.listHeader}>
            <span>PROGRAMA</span>
            <span>COMANDO</span>
            <span>UBICACIÓN</span>
            <span>USUARIO</span>
            <span>ESTADO</span>
          </div>
          {items.map((item) => (
            <div key={item.name} className={styles.item}>
              <div className={styles.itemName}>{item.name}</div>
              <div className={styles.itemCommand}>{item.command}</div>
              <div className={styles.itemLocation}>{item.location}</div>
              <div className={styles.itemUser}>{item.user}</div>
              <div className={styles.itemToggle}>
                <div
                  className={`${styles.toggle} ${item.enabled ? styles.toggleOn : ""}`}
                  onClick={() => handleToggle(item)}
                >
                  <div className={styles.toggleKnob} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmItem !== null}
        title="Deshabilitar programa de inicio"
        message={`¿Deseas deshabilitar "${confirmItem?.name}" del arranque?`}
        details={`Comando: ${confirmItem?.command}\nUbicación: ${confirmItem?.location}`}
        confirmLabel="DESHABILITAR"
        danger
        onConfirm={() => confirmItem && doToggle(confirmItem, false)}
        onCancel={() => setConfirmItem(null)}
      />
    </div>
  );
}
