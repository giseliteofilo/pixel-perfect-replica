import { useEffect, useState } from "react";

export function useNow(interval = 1000, active = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval, active]);
  return now;
}
