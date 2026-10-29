export type Priority = "low" | "medium" | "high";
export type Status = "pending" | "in_progress" | "done";
export type TimerMode = "simple" | "pomodoro";
export type PomodoroPhase = "focus" | "short_break" | "long_break";

export interface Subject {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  priority: Priority | null;
  status: Status;
  dueDate: string | null; // yyyy-MM-dd
  estimatedMinutes: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface StudySession {
  id: string;
  activityId: string | null;
  subjectId: string | null;
  activityNameSnapshot: string;
  subjectNameSnapshot: string;
  subjectColorSnapshot: string;
  mode: TimerMode;
  durationSeconds: number;
  startedAt: string;
  endedAt: string | null;
  completed: boolean;
  cycleStatus: "complete" | "incomplete" | null;
}

export interface StatusChange {
  id: string;
  activityId: string;
  from: Status | null;
  to: Status;
  at: string;
}

export interface PomodoroPrefs {
  focus: number;
  shortBreak: number;
  longBreak: number;
  cyclesBeforeLong: number;
}

export interface Settings {
  theme: "light" | "dark";
  language: "pt-BR";
  weekStartsOn: 0 | 1;
  notificationsEnabled: boolean;
  notificationPreferences: { dayBefore: boolean; overdue: boolean };
  timerPreferences: { defaultMode: TimerMode };
  pomodoroPreferences: PomodoroPrefs;
  soundEnabled: boolean;
  preferredSubjectView: "cards" | "list";
  preferredActivityView: "list" | "kanban";
}

export interface TimerState {
  activityId: string;
  mode: TimerMode;
  phase: PomodoroPhase;
  running: boolean;
  accumulatedSeconds: number;
  runningSince: string | null;
  sessionStartedAt: string;
  completedFocusCycles: number;
  awaitingNext: boolean;
  nextPhase: PomodoroPhase | null;
}

export interface AppState {
  version: number;
  subjects: Subject[];
  activities: Activity[];
  sessions: StudySession[];
  statusHistory: StatusChange[];
  settings: Settings;
  timer: TimerState | null;
  notified: Record<string, true>;
}
