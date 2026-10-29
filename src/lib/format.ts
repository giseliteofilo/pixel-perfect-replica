import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Priority, Status, TimerMode, PomodoroPhase } from "./types";

export const fmtDate = (iso: string) => format(parseISO(iso), "dd/MM/yyyy", { locale: ptBR });
export const fmtTime = (iso: string) => format(parseISO(iso), "HH:mm", { locale: ptBR });
export const fmtDateTime = (iso: string) => format(parseISO(iso), "dd/MM/yyyy HH:mm", { locale: ptBR });

export function fmtDuration(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${String(m).padStart(2, "0")}min` : ""}`;
  if (m > 0) return `${m}min`;
  return `${s}s`;
}

export function fmtMinutes(min: number) {
  return fmtDuration(min * 60);
}

export function fmtClock(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(r).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export const hours = (sec: number) => Math.round((sec / 3600) * 10) / 10;

export const STATUS_LABEL: Record<Status, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  done: "Concluída",
};
export const PRIORITY_LABEL: Record<Priority, string> = { low: "Baixa", medium: "Média", high: "Alta" };
export const PRIORITY_RANK: Record<Priority, number> = { high: 3, medium: 2, low: 1 };
export const MODE_LABEL: Record<TimerMode, string> = { simple: "Cronômetro simples", pomodoro: "Pomodoro" };
export const PHASE_LABEL: Record<PomodoroPhase, string> = {
  focus: "Concentração",
  short_break: "Pausa curta",
  long_break: "Pausa longa",
};
