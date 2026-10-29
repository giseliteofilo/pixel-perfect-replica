import { addDays, eachDayOfInterval, endOfDay, format, startOfDay, startOfWeek, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { StudySession } from "./types";

export function secondsOnDay(sessions: StudySession[], day: Date) {
  const k = format(day, "yyyy-MM-dd");
  return sessions.filter((s) => format(new Date(s.startedAt), "yyyy-MM-dd") === k).reduce((n, s) => n + s.durationSeconds, 0);
}

export function weekData(sessions: StudySession[], weekStartsOn: 0 | 1, ref = new Date()) {
  const start = startOfWeek(ref, { weekStartsOn });
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    const sec = secondsOnDay(sessions, d);
    return { label: format(d, "EEE", { locale: ptBR }).replace(".", ""), date: d, horas: Math.round((sec / 3600) * 100) / 100, sec };
  });
}

export function rangeDays(from: Date, to: Date) {
  return eachDayOfInterval({ start: startOfDay(from), end: endOfDay(to) });
}

export function periodStart(period: string): Date | null {
  const now = new Date();
  if (period === "7") return startOfDay(subDays(now, 6));
  if (period === "30") return startOfDay(subDays(now, 29));
  if (period === "90") return startOfDay(subDays(now, 89));
  return null;
}
