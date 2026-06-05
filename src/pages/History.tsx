import SectionHeader from "../components/SectionHeader";
import styles from "./History.module.css";

interface HistoryEntry {
  id: number;
  module: string;
  action: string;
  details: string;
  reverted: boolean;
  created_at: string;
}

const MOCK_HISTORY: HistoryEntry[] = [
  {
    id: 1,
    module: "limpieza",
    action: "Limpieza de archivos temporales",
    details: "562 MB liberados · 1,247 archivos eliminados",
    reverted: false,
    created_at: "2025-01-15 14:32:00",
  },
  {
    id: 2,
    module: "servicios",
    action: "Servicio desactivado: Spooler",
    details: "Tipo de inicio: Automatic → Disabled",
    reverted: true,
    created_at: "2025-01-14 09:15:00",
  },
  {
    id: 3,
    module: "red",
    action: "DNS cambiado a Cloudflare",
    details: "192.168.1.1 → 1.1.1.1, 1.0.0.1",
    reverted: false,
    created_at: "2025-01-13 18:45:00",
  },
];

export default function History() {
  const moduleColor = (mod: string) => {
    switch (mod) {
      case "limpieza": return "#39ff14";
      case "servicios": return "#ffb800";
      case "red": return "#00bfff";
      case "arranque": return "#9b59b6";
      default: return "var(--text-muted)";
    }
  };

  return (
    <div className={styles.page}>
      <SectionHeader
        title="Historial y Reversión"
        subtitle="Registro de todas las operaciones · Revertir cambios individuales"
      />

      <div className={styles.list}>
        <div className={styles.listHeader}>
          <span>FECHA</span>
          <span>MÓDULO</span>
          <span>ACCIÓN</span>
          <span>DETALLES</span>
          <span>ESTADO</span>
        </div>
        {MOCK_HISTORY.map((entry) => (
          <div key={entry.id} className={styles.item}>
            <div className={styles.date}>{entry.created_at}</div>
            <div className={styles.module}>
              <span
                className={styles.moduleDot}
                style={{ background: moduleColor(entry.module) }}
              />
              {entry.module.toUpperCase()}
            </div>
            <div className={styles.action}>{entry.action}</div>
            <div className={styles.details}>{entry.details}</div>
            <div className={styles.status}>
              {entry.reverted ? (
                <span className={styles.reverted}>REVERTIDO</span>
              ) : (
                <button className="danger">REVERTIR</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {MOCK_HISTORY.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>↺</div>
          <div>No hay operaciones registradas</div>
        </div>
      )}
    </div>
  );
}
