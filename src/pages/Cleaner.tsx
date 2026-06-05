import { useState } from "react";
import SectionHeader from "../components/SectionHeader";
import styles from "./Cleaner.module.css";

interface CleanableItem {
  category: string;
  path: string;
  size_bytes: number;
  description: string;
  selected: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function Cleaner() {
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [items, setItems] = useState<CleanableItem[]>([]);

  const totalSelected = items
    .filter((i) => i.selected)
    .reduce((sum, i) => sum + i.size_bytes, 0);

  const handleScan = async () => {
    setScanning(true);
    // Will invoke scan_temp_files via Tauri — for now, simulated
    await new Promise((r) => setTimeout(r, 1500));
    setItems([
      {
        category: "Temp del sistema",
        path: "C:\\Windows\\Temp",
        size_bytes: 234_567_890,
        description: "Archivos temporales del sistema",
        selected: false,
      },
      {
        category: "Temp del usuario",
        path: "%LOCALAPPDATA%\\Temp",
        size_bytes: 156_789_012,
        description: "Archivos temporales del perfil",
        selected: false,
      },
      {
        category: "Caché Windows Update",
        path: "C:\\Windows\\SoftwareDistribution\\Download",
        size_bytes: 89_012_345,
        description: "Descargas de actualizaciones completadas",
        selected: false,
      },
      {
        category: "Miniaturas",
        path: "%LOCALAPPDATA%\\Microsoft\\Windows\\Explorer",
        size_bytes: 45_678_901,
        description: "Caché de miniaturas del explorador",
        selected: false,
      },
      {
        category: "Prefetch",
        path: "C:\\Windows\\Prefetch",
        size_bytes: 23_456_789,
        description: "Datos de pre-carga de aplicaciones",
        selected: false,
      },
      {
        category: "Chrome Cache",
        path: "%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Cache",
        size_bytes: 312_456_789,
        description: "Caché del navegador Chrome",
        selected: false,
      },
    ]);
    setScanned(true);
    setScanning(false);
  };

  const toggleItem = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const totalSize = items.reduce((sum, i) => sum + i.size_bytes, 0);

  return (
    <div className={styles.page}>
      <SectionHeader
        title="Limpiador"
        subtitle="Analizar y eliminar archivos temporales y caché"
      />

      <div className={styles.toolbar}>
        <button
          className="primary"
          onClick={handleScan}
          disabled={scanning}
        >
          {scanning ? "ANALIZANDO..." : "ESCANEAR SISTEMA"}
        </button>
        {scanned && (
          <div className={styles.summary}>
            <span className="mono">
              {items.length} categorías · {formatBytes(totalSize)} total
            </span>
          </div>
        )}
      </div>

      {scanned && (
        <>
          <div className={styles.itemList}>
            <div className={styles.listHeader}>
              <span>CATEGORÍA</span>
              <span>RUTA</span>
              <span>TAMAÑO</span>
              <span>SELECCIONAR</span>
            </div>
            {items.map((item, index) => (
              <div
                key={index}
                className={`${styles.item} ${item.selected ? styles.selected : ""}`}
                onClick={() => toggleItem(index)}
              >
                <div className={styles.itemCategory}>
                  <span className={styles.itemName}>{item.category}</span>
                  <span className={styles.itemDesc}>{item.description}</span>
                </div>
                <div className={styles.itemPath}>{item.path}</div>
                <div className={styles.itemSize}>{formatBytes(item.size_bytes)}</div>
                <div className={styles.itemCheck}>
                  <div
                    className={`${styles.checkbox} ${item.selected ? styles.checked : ""}`}
                  >
                    {item.selected && "✓"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalSelected > 0 && (
            <div className={styles.actionBar}>
              <span className="mono">
                {formatBytes(totalSelected)} seleccionado para limpiar
              </span>
              <button className="danger">
                LIMPIAR SELECCIONADOS
              </button>
            </div>
          )}
        </>
      )}

      {!scanned && !scanning && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>⊘</div>
          <div className={styles.emptyText}>
            Ejecuta un escaneo para detectar archivos temporales y caché
          </div>
        </div>
      )}
    </div>
  );
}
