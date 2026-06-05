import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import styles from "./RealtimeChart.module.css";

interface DataPoint {
  time: string;
  value: number;
}

interface RealtimeChartProps {
  data: DataPoint[];
  label: string;
  unit?: string;
  color?: string;
  maxY?: number;
  height?: number;
}

export default function RealtimeChart({
  data,
  label,
  unit = "%",
  color = "#39ff14",
  maxY = 100,
  height = 120,
}: RealtimeChartProps) {
  const latestValue = data.length > 0 ? data[data.length - 1].value : 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={styles.currentValue} style={{ color }}>
          {latestValue.toFixed(1)}
          <span className={styles.unit}>{unit}</span>
        </span>
      </div>
      <div className={styles.chart}>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid
              strokeDasharray="2 4"
              stroke="#1a1a1a"
              vertical={false}
            />
            <XAxis dataKey="time" hide />
            <YAxis domain={[0, maxY]} hide />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              fill={`${color}15`}
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className={styles.scale}>
        <span>{maxY}{unit}</span>
        <span>0{unit}</span>
      </div>
    </div>
  );
}
