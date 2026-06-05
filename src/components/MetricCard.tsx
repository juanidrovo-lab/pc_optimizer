import styles from "./MetricCard.module.css";

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  status?: "ok" | "warn" | "critical";
  secondary?: string;
}

export default function MetricCard({
  label,
  value,
  unit,
  status = "ok",
  secondary,
}: MetricCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.label}>{label}</div>
      <div className={`${styles.value} ${styles[status]}`}>
        <span className={styles.number}>{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
      {secondary && <div className={styles.secondary}>{secondary}</div>}
    </div>
  );
}
