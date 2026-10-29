import { format } from "date-fns";
import type { Activity, StatusChange, StudySession, Status } from "./types";

export function percent(done: number, total: number) {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export function subjectProgress(activities: Activity[], subjectId: string) {
  const list = activities.filter((a) => a.subjectId === subjectId);
  const done = list.filter((a) => a.status === "done").length;
  return { total: list.length, done, percent: percent(done, list.length) };
}

export function overallProgress(activities: Activity[]) {
  const done = activities.filter((a) => a.status === "done").length;
  return { total: activities.length, done, percent: percent(done, activities.length) };
}

export function todayKey(d = new Date()) {
  return format(d, "yyyy-MM-dd");
}

export function isOverdue(a: Activity, today = todayKey()) {
  return a.status !== "done" && !!a.dueDate && a.dueDate < today;
}

export function realSecondsFor(sessions: StudySession[], activityId: string) {
  return sessions.filter((s) => s.activityId === activityId).reduce((n, s) => n + s.durationSeconds, 0);
}

/** Status of an activity at a given moment, replaying the status history. */
export function statusAt(a: Activity, history: StatusChange[], at: string): Status | null {
  if (a.createdAt > at) return null;
  let st: Status = "pending";
  for (const h of history) {
    if (h.activityId === a.id && h.at <= at) st = h.to;
  }
  return st;
}

export function progressAt(activities: Activity[], history: StatusChange[], at: string) {
  let total = 0;
  let done = 0;
  const sorted = [...history].sort((x, y) => x.at.localeCompare(y.at));
  for (const a of activities) {
    const st = statusAt(a, sorted, at);
    if (st === null) continue;
    total++;
    if (st === "done") done++;
  }
  return percent(done, total);
}
