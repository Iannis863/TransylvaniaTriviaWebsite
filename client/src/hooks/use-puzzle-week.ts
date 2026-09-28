import { useEffect, useState } from "react";
import { getCurrentWeekIndex, getPreviewWeekIndex, getRealCurrentWeekIndex, getWeekDateRange } from "@/lib/weeklyEngine";

function currentWeek() {
  return { weekIndex: getCurrentWeekIndex(), isPreview: getPreviewWeekIndex() !== null };
}

export function usePuzzleWeek() {
  const [week, setWeek] = useState(currentWeek);
  useEffect(() => {
    let boundaryTimer: ReturnType<typeof setTimeout>;
    const update = () => {
      const next = currentWeek();
      setWeek(previous => previous.weekIndex === next.weekIndex && previous.isPreview === next.isPreview ? previous : next);
      clearTimeout(boundaryTimer);
      const { nextResetAt } = getWeekDateRange(getRealCurrentWeekIndex());
      boundaryTimer = setTimeout(update, Math.max(1, nextResetAt.getTime() - Date.now()));
    };
    update();
    // Recheck after a suspended tab resumes or the device clock/preview setting changes.
    const clockTimer = setInterval(update, 30000);
    window.addEventListener("focus", update);
    window.addEventListener("storage", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearTimeout(boundaryTimer);
      clearInterval(clockTimer);
      window.removeEventListener("focus", update);
      window.removeEventListener("storage", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return week;
}
