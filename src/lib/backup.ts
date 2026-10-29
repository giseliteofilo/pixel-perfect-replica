import { DATA_VERSION, defaultState, getState, migrate } from "./store";
import type { AppState } from "./types";

export const BACKUP_FORMAT = "planejador-estudos-backup";

export function buildBackup() {
  const s = getState();
  return {
    format: BACKUP_FORMAT,
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      subjects: s.subjects,
      activities: s.activities,
      sessions: s.sessions,
      statusHistory: s.statusHistory,
      settings: s.settings,
      notified: s.notified,
    },
  };
}

export function downloadBackup() {
  const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `planejador-estudos-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

const isStr = (v: unknown) => typeof v === "string";
const uniq = (ids: string[]) => new Set(ids).size === ids.length;

/** Validates a parsed backup. Returns the restored state or a list of errors. */
export function validateBackup(raw: unknown): { ok: true; state: AppState } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") return { ok: false, errors: ["O arquivo não contém um JSON válido."] };
  const r = raw as Record<string, any>;
  if (r.format !== BACKUP_FORMAT) errors.push("O arquivo não é um backup do Planejador de Estudos.");
  if (typeof r.version !== "number") errors.push("Versão do formato ausente.");
  else if (r.version > DATA_VERSION) errors.push(`Versão do backup (${r.version}) é mais nova que a suportada (${DATA_VERSION}).`);
  const d = r.data;
  if (!d || typeof d !== "object") errors.push("Estrutura de dados ausente.");
  if (errors.length) return { ok: false, errors };

  for (const k of ["subjects", "activities", "sessions", "statusHistory"]) {
    if (!Array.isArray(d[k])) errors.push(`Campo "${k}" inválido.`);
  }
  if (errors.length) return { ok: false, errors };

  const subjIds = d.subjects.map((s: any) => s?.id);
  const actIds = d.activities.map((a: any) => a?.id);
  if (!d.subjects.every((s: any) => isStr(s?.id) && isStr(s?.name) && s.name.trim()))
    errors.push("Há matérias com dados inválidos.");
  if (!d.activities.every((a: any) => isStr(a?.id) && isStr(a?.title) && ["pending", "in_progress", "done"].includes(a?.status)))
    errors.push("Há atividades com dados inválidos.");
  if (!d.sessions.every((x: any) => isStr(x?.id) && Number.isFinite(x?.durationSeconds) && x.durationSeconds >= 0 && isStr(x?.startedAt)))
    errors.push("Há sessões com dados inválidos.");
  if (!uniq(subjIds) || !uniq(actIds) || !uniq(d.sessions.map((x: any) => x.id)))
    errors.push("O backup contém IDs duplicados.");
  const subjSet = new Set(subjIds);
  if (d.activities.some((a: any) => !subjSet.has(a.subjectId)))
    errors.push("Há atividades vinculadas a matérias inexistentes.");
  if (errors.length) return { ok: false, errors };

  const actSet = new Set(actIds);
  const state = migrate({ ...defaultState(), ...d });
  // Repair dangling optional links instead of rejecting.
  state.sessions = state.sessions.map((x) => ({
    ...x,
    activityId: x.activityId && actSet.has(x.activityId) ? x.activityId : null,
    subjectId: x.subjectId && subjSet.has(x.subjectId) ? x.subjectId : null,
  }));
  state.statusHistory = state.statusHistory.filter((h) => actSet.has(h.activityId));
  return { ok: true, state };
}
