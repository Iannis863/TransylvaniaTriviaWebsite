import { useEffect, useState } from "react";
import { getCurrentWeekIndex, getPreviewWeekIndex, getRealCurrentWeekIndex, getWeekDateRange } from "@/lib/weeklyEngine";

function currentWeek() {
  return { weekIndex: getCurrentWeekIndex(), isPreview: getPreviewWeekIndex() !== null };
}

export function usePuzzleWeek() {
  const [week, setWeek] = useState(currentWeek);
  useEffect(() => {
    let boundaryTimer: ReturnType<typeof setTimeout>;
    let clockOffset = 0;
    let disposed = false;
    let request = 0;
    const apply = () => {
      const preview = getPreviewWeekIndex();
      const now = new Date(Date.now() + clockOffset);
      const next = { weekIndex: preview ?? getRealCurrentWeekIndex(now), isPreview: preview !== null };
      if (disposed) return;
      setWeek(previous => previous.weekIndex === next.weekIndex && previous.isPreview === next.isPreview ? previous : next);
      clearTimeout(boundaryTimer);
      const { nextResetAt } = getWeekDateRange(getRealCurrentWeekIndex(now));
      boundaryTimer = setTimeout(update, Math.max(1, nextResetAt.getTime() - now.getTime()));
    };
    const update = () => {
      // Reset immediately at the known boundary; network latency cannot keep last week's unlock.
      apply();
      const version = ++request;
      void fetch("/api/puzzles/week", { cache: "no-store" }).then(async response => {
        if (!response.ok) return;
        const data = await response.json();
        if (disposed || version !== request || !Number.isSafeInteger(data.weekIndex)) return;
        const serverTime = Date.parse(data.serverTime);
        if (!Number.isFinite(serverTime) || getRealCurrentWeekIndex(new Date(serverTime)) !== data.weekIndex) return;
        clockOffset = serverTime - Date.now();
        apply();
      }).catch(() => { /* Keep using the last known clock while offline. */ });
    };
    update();
    const clockTimer = setInterval(update, 30000);
    window.addEventListener("focus", update);
    window.addEventListener("storage", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      disposed = true;
      clearTimeout(boundaryTimer);
      clearInterval(clockTimer);
      window.removeEventListener("focus", update);
      window.removeEventListener("storage", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return week;
}
