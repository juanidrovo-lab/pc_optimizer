import { useState, useEffect } from "react";
import SectionHeader from "../components/SectionHeader";
import ConfirmDialog from "../components/ConfirmDialog";
import styles from "./Services.module.css";

interface ServiceItem {
  name: string;
  display_name: string;
  description: string;
  status: string;
  start_type: string;
  classification: string;
  dependencies: string[];
}

const MOCK_SERVICES: ServiceItem[] = [
  { name: "WSearch", display_name: "Windows Search", description: "Indexación de archivos para búsqueda rápida", status: "Running", start_type: "Automatic", classification: "recomendado_desactivar", dependencies: [] },
  { name: "Spooler", display_name: "Cola de impresión", description: "Gestiona trabajos de impresión en cola", status: "Running", start_type: "Automatic", classification: "recomendado_desactivar", dependencies: [] },
  { name: "Winmgmt", display_name: "Instrumentación de administración", description: "Interfaz WMI para scripts de administración", status: "Running", start_type: "Automatic", classification: "esencial", dependencies: ["CryptSvc"] },
  { name: "DiagTrack", display_name: "Telemetría de Windows", description: "Envía datos de diagnóstico a Microsoft", status: "Running", start_type: "Automatic", classification: "recomendado_desactivar", dependencies: [] },
  { name: "Dhcp", display_name: "Cliente DHCP", description: "Asignación automática de IP en la red", status: "Running", start_type: "Automatic", classification: "esencial", dependencies: ["Dnscache", "NlaSvc"] },
  { name: "SysMain", display_name: "Superfetch", description: "Pre-carga de aplicaciones frecuentes en memoria", status: "Running", start_type: "Automatic", classification: "recomendado_desactivar", dependencies: [] },
  { name: "XblAuthManager", display_name: "Xbox Live Auth Manager", description: "Autenticación de servicios Xbox Live", status: "Stopped", start_type: "Manual", classification: "recomendado_desactivar", dependencies: [] },
  { name: "Themes", display_name: "Temas", description: "Gestión de temas visuales del escritorio", status: "Running", start_type: "Automatic", classification: "esencial", dependencies: [] },
];

export default function Services() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<{
    service: ServiceItem;
    newType: string;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const svcs = await invoke<ServiceItem[]>("get_services");
        setServices(svcs);
      } catch {
        setServices(MOCK_SERVICES);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = services
    .filter((s) => filter === "all" || s.classification === filter)
    .filter(
      (s) =>
        search === "" ||
        s.display_name.toLowerCase().includes(search.toLowerCase()) ||
        s.name.toLowerCase().includes(search.toLowerCase())
    );

  const classColor = (c: string) => {
    if (c === "esencial") return "var(--status-critical)";
    if (c === "recomendado_desactivar") return "var(--status-warn)";
    return "var(--text-muted)";
  };

  const classLabel = (c: string) => {
    if (c === "esencial") return "ESENCIAL";
    if (c === "recomendado_desactivar") return "REC. DESACTIVAR";
    return "OPCIONAL";
  };

  const handleChangeStartType = async (svc: ServiceItem, newType: string) => {
    if (svc.classification === "esencial") {
      return;
    }

    if (svc.dependencies.length > 0 && newType === "Disabled") {
      setConfirmAction({ service: svc, newType });
      return;
    }

    setConfirmAction({ service: svc, newType });
  };

  const doChange = async () => {
    if (!confirmAction) return;
    const { service, newType } = confirmAction;

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("set_service_start_type", {
        name: service.name,
        displayName: service.display_name,
        currentStartType: service.start_type,
        newStartType: newType,
      });
    } catch {
      // Simulated
    }

    setServices((prev) =>
      prev.map((s) =>
        s.name === service.name ? { ...s, start_type: newType } : s
      )
    );
    setConfirmAction(null);
  };

  return (
    <div className={styles.page}>
      <SectionHeader
        title="Servicios"
        subtitle="Gestión de servicios de Windows · Estado previo guardado para reversión"
      />

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {["all", "esencial", "recomendado_desactivar", "opcional"].map((f) => (
            <button
              key={f}
              className={filter === f ? "primary" : ""}
              onClick={() => setFilter(f)}
            >
              {f === "all"
                ? "TODOS"
                : f === "esencial"
                  ? "ESENCIALES"
                  : f === "recomendado_desactivar"
                    ? "REC. DESACTIVAR"
                    : "OPCIONALES"}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Buscar servicio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.stats}>
        <span>
          {filtered.length} servicios · {services.filter((s) => s.status === "Running").length} activos
        </span>
      </div>

      {loading ? (
        <div className={styles.loading}>Cargando servicios...</div>
      ) : (
        <div className={styles.list}>
          <div className={styles.listHeader}>
            <span>SERVICIO</span>
            <span>DESCRIPCIÓN</span>
            <span>CLASIFICACIÓN</span>
            <span>ESTADO</span>
            <span>TIPO INICIO</span>
          </div>
          {filtered.map((svc) => (
            <div key={svc.name} className={styles.item}>
              <div className={styles.svcName}>
                <span className={styles.displayName}>{svc.display_name}</span>
                <span className={styles.svcId}>{svc.name}</span>
              </div>
              <div className={styles.svcDesc}>
                {svc.description || "Sin descripción"}
                {svc.dependencies.length > 0 && (
                  <span className={styles.depsWarning}>
                    ⚠ {svc.dependencies.length} dependencias
                  </span>
                )}
              </div>
              <div
                className={styles.svcClass}
                style={{ color: classColor(svc.classification) }}
              >
                {classLabel(svc.classification)}
              </div>
              <div className={styles.svcStatus}>
                <span
                  className={styles.statusDot}
                  style={{
                    background:
                      svc.status === "Running"
                        ? "var(--accent)"
                        : "var(--text-muted)",
                  }}
                />
                {svc.status === "Running" ? "Activo" : "Detenido"}
              </div>
              <div className={styles.svcStartType}>
                <select
                  value={svc.start_type}
                  onChange={(e) => handleChangeStartType(svc, e.target.value)}
                  disabled={svc.classification === "esencial"}
                  className={svc.classification === "esencial" ? styles.selectDisabled : ""}
                >
                  <option value="Automatic">Automático</option>
                  <option value="Manual">Manual</option>
                  <option value="Disabled">Deshabilitado</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmAction !== null}
        title="Modificar servicio"
        message={`¿Cambiar "${confirmAction?.service.display_name}" a ${confirmAction?.newType}?`}
        details={
          confirmAction?.service.dependencies.length
            ? `⚠ Este servicio tiene dependencias:\n${confirmAction.service.dependencies.join("\n")}\n\nCambiar el tipo de inicio puede afectar estos servicios.`
            : `Servicio: ${confirmAction?.service.name}\nCambio: ${confirmAction?.service.start_type} → ${confirmAction?.newType}\n\nEl estado anterior se guardará para poder revertirlo.`
        }
        confirmLabel="APLICAR"
        danger
        onConfirm={doChange}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
