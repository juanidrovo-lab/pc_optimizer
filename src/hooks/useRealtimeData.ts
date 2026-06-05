import { useState, useEffect, useCallback, useRef } from "react";

interface DataPoint {
  time: string;
  value: number;
}

function timestamp(): string {
  const d = new Date();
  return `${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

export function useRealtimeData(
  fetcher: () => Promise<number> | number,
  intervalMs = 1000,
  maxPoints = 60
) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [current, setCurrent] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const update = useCallback(async () => {
    const value = await fetcherRef.current();
    setCurrent(value);
    setData((prev) => {
      const next = [...prev, { time: timestamp(), value }];
      return next.slice(-maxPoints);
    });
  }, [maxPoints]);

  useEffect(() => {
    update();
    const iv = setInterval(update, intervalMs);
    return () => clearInterval(iv);
  }, [update, intervalMs]);

  return { data, current };
}
