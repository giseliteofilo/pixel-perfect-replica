import { useSyncExternalStore } from "react";
import type {
  Activity,
  AppState,
  PomodoroPhase,
  Settings,
  Status,
  StudySession,
  Subject,
  TimerMode,
} from "./types";

export const STORAGE_KEY = "planejador-estudos:data";
export const HEARTBEAT_KEY = "planejador-estudos:heartbeat";
export const DATA_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  language: "pt-BR",
  weekStartsOn: 1,
  notificationsEnabled: false,
  notificationPreferences: { dayBefore: true, overdue: true },
  timerPreferences: { defaultMode: "simple" },
  pomodoroPreferences: { focus: 25, shortBreak: 5, longBreak: 15, cyclesBeforeLong: 4 },
  soundEnabled: true,
  preferredSubjectView: "cards",
  preferredActivityView: "list",
};

export function defaultState(): AppState {
  return {
    version: DATA_VERSION,
    subjects: [],
    activities: [],
    sessions: [],
    statusHistory: [],
    settings: { ...DEFAULT_SETTINGS },
    timer: null,
    notified: {},
  };
}

const SERVER_STATE = defaultState();

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const nowIso = () => new Date().toISOString();

/** Migrate any older/partial stored shape into the current version. */
export function migrate(raw: unknown): AppState {
  const base = defaultState();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<AppState>;
  return {
    version: DATA_VERSION,
    subjects: Array.isArray(r.subjects) ? r.subjects : [],
    activities: Array.isArray(r.activities) ? r.activities : [],
    sessions: Array.isArray(r.sessions) ? r.sessions : [],
    statusHistory: Array.isArray(r.statusHistory) ? r.statusHistory : [],
    settings: {
      ...base.settings,
      ...(r.settings ?? {}),
      notificationPreferences: { ...base.settings.notificationPreferences, ...(r.settings?.notificationPreferences ?? {}) },
      pomodoroPreferences: { ...base.settings.pomodoroPreferences, ...(r.settings?.pomodoroPreferences ?? {}) },
      timerPreferences: { ...base.settings.timerPreferences, ...(r.settings?.timerPreferences ?? {}) },
    },
    timer: r.timer ?? null,
    notified: r.notified ?? {},
  };
}

function recoverTimer(s: AppState): AppState {
  const t = s.timer;
  if (!t || !t.running || !t.runningSince) return s;
  // Browser was closed/reloaded while running: count only up to the last heartbeat.
  const hb = Number(localStorage.getItem(HEARTBEAT_KEY) || 0);
  const since = Date.parse(t.runningSince);
  const until = Math.min(hb || since, Date.now());
  const extra = Math.max(0, Math.floor((until - since) / 1000));
  return { ...s, timer: { ...t, running: false, runningSince: null, accumulatedSeconds: t.accumulatedSeconds + extra } };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return recoverTimer(migrate(raw ? JSON.parse(raw) : null));
  } catch (e) {
    console.error("Falha ao ler dados locais", e);
    return defaultState();
  }
}

let state: AppState | null = null;
const listeners = new Set<() => void>();
export let lastSaveError: string | null = null;

export function getState(): AppState {
  if (typeof window === "undefined") return SERVER_STATE;
  if (!state) {
    state = load();
    persist();
  }
  return state;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    lastSaveError = null;
  } catch (e) {
    lastSaveError = "Não foi possível salvar os dados no navegador.";
    console.error(e);
  }
}

export function setState(fn: (s: AppState) => AppState) {
  state = fn(getState());
  persist();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      state = load();
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, () => SERVER_STATE);
}

/* ---------------- Subjects ---------------- */
export function saveSubject(input: { id?: string; name: string; description: string; color: string; icon: string }) {
  const t = nowIso();
  setState((s) => {
    if (input.id) {
      return {
        ...s,
        subjects: s.subjects.map((x) => (x.id === input.id ? { ...x, ...input, id: x.id, updatedAt: t } : x)),
      };
    }
    const sub: Subject = { ...input, id: uid(), createdAt: t, updatedAt: t };
    return { ...s, subjects: [sub, ...s.subjects] };
  });
}

export function deleteSubject(id: string) {
  setState((s) => {
    const actIds = new Set(s.activities.filter((a) => a.subjectId === id).map((a) => a.id));
    return {
      ...s,
      subjects: s.subjects.filter((x) => x.id !== id),
      activities: s.activities.filter((a) => a.subjectId !== id),
      statusHistory: s.statusHistory.filter((h) => !actIds.has(h.activityId)),
      sessions: s.sessions.map((x) =>
        x.subjectId === id ? { ...x, subjectId: null, activityId: null } : x,
      ),
      timer: s.timer && actIds.has(s.timer.activityId) ? null : s.timer,
    };
  });
}

/* ---------------- Activities ---------------- */
export interface ActivityInput {
  id?: string;
  subjectId: string;
  title: string;
  description: string;
  priority: Activity["priority"];
  dueDate: string | null;
  estimatedMinutes: number | null;
  status?: Status;
}

export function saveActivity(input: ActivityInput) {
  const t = nowIso();
  setState((s) => {
    if (input.id) {
      const prev = s.activities.find((a) => a.id === input.id);
      if (!prev) return s;
      const status = input.status ?? prev.status;
      const changed = status !== prev.status;
      return {
        ...s,
        activities: s.activities.map((a) =>
          a.id === input.id
            ? {
                ...a,
                ...input,
                id: a.id,
                status,
                updatedAt: t,
                completedAt: changed ? (status === "done" ? t : null) : a.completedAt,
              }
            : a,
        ),
        statusHistory: changed
          ? [...s.statusHistory, { id: uid(), activityId: prev.id, from: prev.status, to: status, at: t }]
          : s.statusHistory,
      };
    }
    const status = input.status ?? "pending";
    const a: Activity = {
      id: uid(),
      subjectId: input.subjectId,
      title: input.title,
      description: input.description,
      priority: input.priority,
      dueDate: input.dueDate,
      estimatedMinutes: input.estimatedMinutes,
      status,
      createdAt: t,
      updatedAt: t,
      completedAt: status === "done" ? t : null,
    };
    return {
      ...s,
      activities: [a, ...s.activities],
      statusHistory: [...s.statusHistory, { id: uid(), activityId: a.id, from: null, to: status, at: t }],
    };
  });
}

export function setActivityStatus(id: string, to: Status) {
  const t = nowIso();
  setState((s) => {
    const prev = s.activities.find((a) => a.id === id);
    if (!prev || prev.status === to) return s;
    return {
      ...s,
      activities: s.activities.map((a) =>
        a.id === id ? { ...a, status: to, updatedAt: t, completedAt: to === "done" ? t : null } : a,
      ),
      statusHistory: [...s.statusHistory, { id: uid(), activityId: id, from: prev.status, to, at: t }],
    };
  });
}

export function deleteActivity(id: string) {
  setState((s) => ({
    ...s,
    activities: s.activities.filter((a) => a.id !== id),
    statusHistory: s.statusHistory.filter((h) => h.activityId !== id),
    sessions: s.sessions.map((x) => (x.activityId === id ? { ...x, activityId: null } : x)),
    timer: s.timer?.activityId === id ? null : s.timer,
  }));
}

/* ---------------- Sessions ---------------- */
export function deleteSession(id: string) {
  setState((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) }));
}

function buildSession(
  s: AppState,
  activityId: string,
  mode: TimerMode,
  durationSeconds: number,
  startedAt: string,
  cycleStatus: StudySession["cycleStatus"],
): StudySession | null {
  const a = s.activities.find((x) => x.id === activityId);
  if (!a || durationSeconds < 1) return null;
  const sub = s.subjects.find((x) => x.id === a.subjectId);
  return {
    id: uid(),
    activityId: a.id,
    subjectId: a.subjectId,
    activityNameSnapshot: a.title,
    subjectNameSnapshot: sub?.name ?? "—",
    subjectColorSnapshot: sub?.color ?? "#2563eb",
    mode,
    durationSeconds: Math.round(durationSeconds),
    startedAt,
    endedAt: nowIso(),
    completed: cycleStatus !== "incomplete",
    cycleStatus,
  };
}

/* ---------------- Timer ---------------- */
export function phaseTarget(settings: Settings, phase: PomodoroPhase) {
  const p = settings.pomodoroPreferences;
  return (phase === "focus" ? p.focus : phase === "short_break" ? p.shortBreak : p.longBreak) * 60;
}

export function elapsedSeconds(t: AppState["timer"], now = Date.now()) {
  if (!t) return 0;
  const run = t.running && t.runningSince ? Math.max(0, (now - Date.parse(t.runningSince)) / 1000) : 0;
  return t.accumulatedSeconds + run;
}

export function startTimer(activityId: string, mode: TimerMode): string | null {
  const s = getState();
  if (s.timer) return "Já existe uma sessão ativa. Pause e finalize a sessão atual antes de iniciar outra.";
  if (!s.activities.some((a) => a.id === activityId)) return "Selecione uma atividade válida.";
  const t = nowIso();
  setState((st) => ({
    ...st,
    timer: {
      activityId,
      mode,
      phase: "focus",
      running: true,
      accumulatedSeconds: 0,
      runningSince: t,
      sessionStartedAt: t,
      completedFocusCycles: 0,
      awaitingNext: false,
      nextPhase: null,
    },
  }));
  localStorage.setItem(HEARTBEAT_KEY, String(Date.now()));
  return null;
}

export function pauseTimer() {
  setState((s) => {
    const t = s.timer;
    if (!t || !t.running) return s;
    return { ...s, timer: { ...t, running: false, runningSince: null, accumulatedSeconds: elapsedSeconds(t) } };
  });
}

export function resumeTimer() {
  setState((s) => {
    const t = s.timer;
    if (!t || t.running || t.awaitingNext) return s;
    return { ...s, timer: { ...t, running: true, runningSince: nowIso() } };
  });
  localStorage.setItem(HEARTBEAT_KEY, String(Date.now()));
}

/** Finish the session. Simple: records full time. Pomodoro focus: records an incomplete cycle. */
export function finishTimer(): StudySession | null {
  let rec: StudySession | null = null;
  setState((s) => {
    const t = s.timer;
    if (!t) return s;
    const el = elapsedSeconds(t);
    if (t.mode === "simple") rec = buildSession(s, t.activityId, "simple", el, t.sessionStartedAt, null);
    else if (t.phase === "focus" && !t.awaitingNext)
      rec = buildSession(s, t.activityId, "pomodoro", el, t.sessionStartedAt, "incomplete");
    return { ...s, timer: null, sessions: rec ? [rec, ...s.sessions] : s.sessions };
  });
  return rec;
}

/** Called when the current pomodoro phase reaches its target. */
export function completePomodoroPhase() {
  setState((s) => {
    const t = s.timer;
    if (!t || t.mode !== "pomodoro" || t.awaitingNext) return s;
    const target = phaseTarget(s.settings, t.phase);
    let sessions = s.sessions;
    let cycles = t.completedFocusCycles;
    let next: PomodoroPhase = "focus";
    if (t.phase === "focus") {
      const rec = buildSession(s, t.activityId, "pomodoro", target, t.sessionStartedAt, "complete");
      if (rec) sessions = [rec, ...sessions];
      cycles += 1;
      next = cycles % s.settings.pomodoroPreferences.cyclesBeforeLong === 0 ? "long_break" : "short_break";
    }
    return {
      ...s,
      sessions,
      timer: {
        ...t,
        running: false,
        runningSince: null,
        accumulatedSeconds: target,
        completedFocusCycles: cycles,
        awaitingNext: true,
        nextPhase: next,
      },
    };
  });
}

export function startNextPhase() {
  const t0 = nowIso();
  setState((s) => {
    const t = s.timer;
    if (!t || !t.awaitingNext || !t.nextPhase) return s;
    return {
      ...s,
      timer: {
        ...t,
        phase: t.nextPhase,
        nextPhase: null,
        awaitingNext: false,
        accumulatedSeconds: 0,
        running: true,
        runningSince: t0,
        sessionStartedAt: t0,
      },
    };
  });
  localStorage.setItem(HEARTBEAT_KEY, String(Date.now()));
}

/* ---------------- Settings ---------------- */
export function updateSettings(patch: Partial<Settings>) {
  setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
}

export function markNotified(key: string) {
  setState((s) => ({ ...s, notified: { ...s.notified, [key]: true } }));
}

export function clearAllData() {
  localStorage.removeItem(HEARTBEAT_KEY);
  setState(() => defaultState());
}

export function replaceData(next: AppState) {
  setState(() => ({ ...next, timer: null }));
}
