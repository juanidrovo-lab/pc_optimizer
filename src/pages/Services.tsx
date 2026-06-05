import { useState } from "react";
import SectionHeader from "../components/SectionHeader";
import styles from "./Services.module.css";

interface ServiceItem {
  name: string;
  displayName: string;
  description: string;
  status: "Running" | "Stopped";
  startType: string;
  classification: "esencial" | "recomendado_desactivar" | "opcional";
}

const MOCK_SERVICES: ServiceItem[] = [
  {
    name: "WSearch",
    displayName: "Windows Search",
    description: "Indexación de archivos para búsqueda rápida",
    status: "Running",
    startType: "Automatic",
    classification: "opcional",
  },
  {
    name: "Spooler",
    displayName: "Cola de impresión",
    description: "Gestiona trabajos de impresión en cola",
    status: "Running",
    startType: "Automatic",
    classification: "recomendado_desactivar",
  },
  {
    name: "Winmgmt",
    displayName: "Instrumentación de administración",
    description: "Interfaz WMI para scripts de administración",
    status: "Running",
    startType: "Automatic",
    classification: "esencial",
  },
  {
    name: "DiagTrack",
    displayName: "Telemetría de Windows",
    description: "Envía datos de diagnóstico a Microsoft",
    status: "Running",
    startType: "Automatic",
    classification: "recomendado_desactivar",
  },
  {
    name: "Dhcp",
    displayName: "Cliente DHCP",
    description: "Asignación automática de IP en la red",
    status: "Running",
    startType: "Automatic",
    classification: "esencial",
  },
];

export default function Services() {
  const [filter, setFilter] = useState<string>("all");

  const filtered =
    filter === "all"
      ? MOCK_SERVICES
      : MOCK_SERVICES.filter((s) => s.classification === filter);

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

  return (
    <div className={styles.page}>
      <SectionHeader
        title="Servicios"
        subtitle="Gestión de servicios de Windows · Guarda estado previo para revertir"
      />

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
              <span className={styles.displayName}>{svc.displayName}</span>
              <span className={styles.svcId}>{svc.name}</span>
            </div>
            <div className={styles.svcDesc}>{svc.description}</div>
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
            <div className={styles.svcStartType}>{svc.startType}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
