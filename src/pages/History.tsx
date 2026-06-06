import { useState, useEffect } from "react";
import SectionHeader from "../components/SectionHeader";
import ConfirmDialog from "../components/ConfirmDialog";
import styles from "./History.module.css";

interface ScanHistoryItem {
  id: number;
  module: string;
  action: string;
  details: string | null;
  bytes_freed: number;
  created_at: string;
}

interface ChangeLogItem {
  id: number;
  scan_id: number | null;
  module: string;
  change_type: string;
  target: string;
  previous_value: string;
  new_value: string;
  reverted: boolean;
  reverted_at: string | null;
  created_at: string;
}

interface RestorePointItem {
  id: number;
  scan_id: number | null;
  description: string;
  created_at: string;
}

type Tab = "history" | "changes" | "restores";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

const MOCK_HISTORY: ScanHistoryItem[] = [
  { id: 1, module: "limpieza", action: "Limpieza de archivos", details: "1,247 archivos eliminados, 562.3 MB liberados", bytes_freed: 589_234_567, created_at: "2025-06-05 14:32:00" },
  { id: 2, module: "servicios", action: "Servicio modificado: Spooler", details: "Automatic → Disabled", bytes_freed: 0, created_at: "2025-06-04 09:15:00" },
  { id: 3, module: "red", action: "DNS cambiado a Cloudflare", details: "192.168.1.1 → 1.1.1.1,1.0.0.1", bytes_freed: 0, created_at: "2025-06-03 18:45:00" },
];

const MOCK_CHANGES: ChangeLogItem[] = [
  { id: 1, scan_id: 2, module: "servicios", change_type: "service", target: "Spooler", previous_value: "Automatic", new_value: "Disabled", reverted: false, reverted_at: null, created_at: "2025-06-04 09:15:00" },
  { id: 2, scan_id: 3, module: "red", change_type: "dns", target: "Wi-Fi", previous_value: "192.168.1.1", new_value: "1.1.1.1,1.0.0.1", reverted: false, reverted_at: null, created_at: "2025-06-03 18:45:00" },
];

export default function History() {
  const [tab, setTab] = useState<Tab>("changes");
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [changes, setChanges] = useState<ChangeLogItem[]>([]);
  const [restores, setRestores] = useState<RestorePointItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [revertTarget, setRevertTarget] = useState<ChangeLogItem | null>(null);
  const [reverting, setReverting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const [h, c, r] = await Promise.all([
        invoke<ScanHistoryItem[]>("get_scan_history"),
        invoke<ChangeLogItem[]>("get_change_log"),
        invoke<RestorePointItem[]>("get_restore_points"),
      ]);
      setHistory(h);
      setChanges(c);
      setRestores(r);
    } catch {
      setHistory(MOCK_HISTORY);
      setChanges(MOCK_CHANGES);
      setRestores([
        { id: 1, scan_id: null, description: "Pre-optimización 2025-06-04", created_at: "2025-06-04 09:14:00" },
      ]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRevert = async () => {
    if (!revertTarget) return;
    setReverting(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("revert_change", { changeId: revertTarget.id });
    } catch {
      // Simulated
    }
    setChanges((prev) =>
      prev.map((c) =>
        c.id === revertTarget.id
          ? { ...c, reverted: true, reverted_at: new Date().toISOString() }
          : c
      )
    );
    setRevertTarget(null);
    setReverting(false);
  };

  const moduleColor = (mod: string) => {
    switch (mod) {
      case "limpieza": return "#39ff14";
      case "servicios": return "#ffb800";
      case "red": return "#00bfff";
      case "arranque": return "#9b59b6";
      default: return "var(--text-muted)";
    }
  };

  const changeTypeLabel = (type: string) => {
    switch (type) {
      case "service": return "Servicio";
      case "dns": return "DNS";
      case "registry": return "Registro";
      case "startup": return "Arranque";
      case "nagle": return "Nagle";
      case "ipv6": return "IPv6";
      default: return type;
    }
  };

  const pendingCount = changes.filter((c) => !c.reverted).length;

  return (
    <div className={styles.page}>
      <SectionHeader
        title="Historial y Reversión"
        subtitle={`${changes.length} cambios registrados · ${pendingCount} reversibles`}
      />

      <div className={styles.tabs}>
        <button
          className={tab === "changes" ? "primary" : ""}
          onClick={() => setTab("changes")}
        >
          CAMBIOS ({changes.length})
        </button>
        <button
          className={tab === "history" ? "primary" : ""}
          onClick={() => setTab("history")}
        >
          OPERACIONES ({history.length})
        </button>
        <button
          className={tab === "restores" ? "primary" : ""}
          onClick={() => setTab("restores")}
        >
          RESTAURACIÓN ({restores.length})
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Cargando historial...</div>
      ) : tab === "changes" ? (
        <div className={styles.list}>
          <div className={styles.changeHeader}>
            <span>FECHA</span>
            <span>MÓDULO</span>
            <span>TIPO</span>
            <span>OBJETIVO</span>
            <span>ANTERIOR → NUEVO</span>
            <span>ACCIÓN</span>
          </div>
          {changes.length === 0 ? (
            <div className={styles.emptyRow}>Sin cambios registrados</div>
          ) : (
            changes.map((c) => (
              <div key={c.id} className={`${styles.changeItem} ${c.reverted ? styles.reverted : ""}`}>
                <div className={styles.date}>{c.created_at}</div>
                <div className={styles.module}>
                  <span className={styles.moduleDot} style={{ background: moduleColor(c.module) }} />
                  {c.module.toUpperCase()}
                </div>
                <div className={styles.changeType}>{changeTypeLabel(c.change_type)}</div>
                <div className={styles.target}>{c.target}</div>
                <div className={styles.values}>
                  <span className={styles.prevValue}>{c.previous_value}</span>
                  <span className={styles.arrow}>→</span>
                  <span className={styles.newValue}>{c.new_value}</span>
                </div>
                <div className={styles.action}>
                  {c.reverted ? (
                    <span className={styles.revertedLabel}>
                      REVERTIDO
                      {c.reverted_at && (
                        <span className={styles.revertedDate}>{c.reverted_at}</span>
                      )}
                    </span>
                  ) : (
                    <button className="danger" onClick={() => setRevertTarget(c)}>
                      REVERTIR
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : tab === "history" ? (
        <div className={styles.list}>
          <div className={styles.historyHeader}>
            <span>FECHA</span>
            <span>MÓDULO</span>
            <span>ACCIÓN</span>
            <span>DETALLES</span>
            <span>LIBERADO</span>
          </div>
          {history.length === 0 ? (
            <div className={styles.emptyRow}>Sin operaciones registradas</div>
          ) : (
            history.map((h) => (
              <div key={h.id} className={styles.historyItem}>
                <div className={styles.date}>{h.created_at}</div>
                <div className={styles.module}>
                  <span className={styles.moduleDot} style={{ background: moduleColor(h.module) }} />
                  {h.module.toUpperCase()}
                </div>
                <div className={styles.historyAction}>{h.action}</div>
                <div className={styles.historyDetails}>{h.details || "—"}</div>
                <div className={styles.historyBytes}>
                  {h.bytes_freed > 0 ? formatBytes(h.bytes_freed) : "—"}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className={styles.list}>
          <div className={styles.restoreHeader}>
            <span>FECHA</span>
            <span>DESCRIPCIÓN</span>
            <span>SCAN ASOCIADO</span>
          </div>
          {restores.length === 0 ? (
            <div className={styles.emptyRow}>
              No se han creado puntos de restauración desde PCOptimizer
            </div>
          ) : (
            restores.map((r) => (
              <div key={r.id} className={styles.restoreItem}>
                <div className={styles.date}>{r.created_at}</div>
                <div className={styles.restoreDesc}>{r.description}</div>
                <div className={styles.restoreScan}>
                  {r.scan_id ? `#${r.scan_id}` : "Manual"}
                </div>
              </div>
            ))
          )}
          <div className={styles.restoreNote}>
            Los puntos de restauración se crean automáticamente antes de aplicar lotes de optimizaciones.
            Para restaurar, usa Panel de Control → Recuperación → Restaurar sistema.
          </div>
        </div>
      )}

      <ConfirmDialog
        open={revertTarget !== null}
        title="Revertir cambio"
        message={`¿Restaurar "${revertTarget?.target}" a su valor anterior?`}
        details={
          revertTarget
            ? `Tipo: ${changeTypeLabel(revertTarget.change_type)}\nObjetivo: ${revertTarget.target}\nValor actual: ${revertTarget.new_value}\nSe restaurará a: ${revertTarget.previous_value}`
            : ""
        }
        confirmLabel={reverting ? "REVIRTIENDO..." : "REVERTIR"}
        danger
        onConfirm={handleRevert}
        onCancel={() => setRevertTarget(null)}
      />
    </div>
  );
}
