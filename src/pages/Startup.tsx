import SectionHeader from "../components/SectionHeader";
import styles from "./Startup.module.css";

interface StartupItem {
  name: string;
  path: string;
  enabled: boolean;
  impact: "alto" | "medio" | "bajo";
}

const MOCK_ITEMS: StartupItem[] = [
  { name: "Spotify", path: "C:\\Users\\...\\Spotify.exe", enabled: true, impact: "alto" },
  { name: "Discord", path: "C:\\Users\\...\\Discord.exe", enabled: true, impact: "alto" },
  { name: "OneDrive", path: "C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe", enabled: true, impact: "medio" },
  { name: "NVIDIA Share", path: "C:\\Program Files\\NVIDIA\\...", enabled: false, impact: "bajo" },
  { name: "Cortana", path: "C:\\Windows\\SystemApps\\...", enabled: false, impact: "medio" },
];

export default function Startup() {
  const impactColor = (impact: string) => {
    if (impact === "alto") return "var(--status-critical)";
    if (impact === "medio") return "var(--status-warn)";
    return "var(--text-muted)";
  };

  return (
    <div className={styles.page}>
      <SectionHeader
        title="Arranque"
        subtitle="Programas de inicio · Impacto medido en tiempo de arranque"
      />

      <div className={styles.info}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>TIEMPO ACTUAL</span>
          <span className={styles.infoValue}>24.3s</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>HISTÓRICO PROMEDIO</span>
          <span className={styles.infoValue}>22.1s</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>PROGRAMAS ACTIVOS</span>
          <span className={styles.infoValue}>
            {MOCK_ITEMS.filter((i) => i.enabled).length}
          </span>
        </div>
      </div>

      <div className={styles.list}>
        <div className={styles.listHeader}>
          <span>PROGRAMA</span>
          <span>RUTA</span>
          <span>IMPACTO</span>
          <span>ESTADO</span>
        </div>
        {MOCK_ITEMS.map((item) => (
          <div key={item.name} className={styles.item}>
            <div className={styles.itemName}>{item.name}</div>
            <div className={styles.itemPath}>{item.path}</div>
            <div
              className={styles.itemImpact}
              style={{ color: impactColor(item.impact) }}
            >
              {item.impact.toUpperCase()}
            </div>
            <div className={styles.itemToggle}>
              <div
                className={`${styles.toggle} ${item.enabled ? styles.toggleOn : ""}`}
              >
                <div className={styles.toggleKnob} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
