import { describe, expect, it } from "vitest";
import { isOverdue, overallProgress, progressAt, subjectProgress } from "./progress";
import { validateBackup } from "./backup";
import type { Activity } from "./types";

const act = (p: Partial<Activity>): Activity => ({
  id: Math.random().toString(),
  subjectId: "s1",
  title: "t",
  description: "",
  priority: null,
  status: "pending",
  dueDate: null,
  estimatedMinutes: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  completedAt: null,
  ...p,
});

describe("progresso", () => {
  it("sem atividades é 0%", () => {
    expect(overallProgress([]).percent).toBe(0);
    expect(subjectProgress([], "s1").percent).toBe(0);
  });
  it("só concluídas contam", () => {
    const list = [act({ status: "done" }), act({ status: "in_progress" }), act({ status: "pending" }), act({ status: "done" })];
    expect(overallProgress(list).percent).toBe(50);
  });
  it("progresso por matéria considera só a matéria", () => {
    const list = [act({ status: "done" }), act({ subjectId: "s2" })];
    expect(subjectProgress(list, "s1").percent).toBe(100);
  });
  it("concluída nunca está atrasada", () => {
    expect(isOverdue(act({ dueDate: "2026-01-01", status: "done" }), "2026-02-01")).toBe(false);
    expect(isOverdue(act({ dueDate: "2026-01-01" }), "2026-02-01")).toBe(true);
    expect(isOverdue(act({ dueDate: "2026-02-01" }), "2026-02-01")).toBe(false);
  });
  it("evolução usa histórico de status", () => {
    const a = act({ id: "a", status: "done" });
    const h = [
      { id: "1", activityId: "a", from: null, to: "pending" as const, at: "2026-01-01T00:00:00.000Z" },
      { id: "2", activityId: "a", from: "pending" as const, to: "done" as const, at: "2026-01-05T00:00:00.000Z" },
    ];
    expect(progressAt([a], h, "2026-01-03T00:00:00.000Z")).toBe(0);
    expect(progressAt([a], h, "2026-01-06T00:00:00.000Z")).toBe(100);
  });
});

describe("backup", () => {
  it("rejeita arquivo de outro formato", () => {
    expect(validateBackup({ foo: 1 }).ok).toBe(false);
  });
  it("rejeita atividade de matéria inexistente", () => {
    const r = validateBackup({
      format: "planejador-estudos-backup",
      version: 1,
      data: { subjects: [], activities: [act({ id: "x" })], sessions: [], statusHistory: [] },
    });
    expect(r.ok).toBe(false);
  });
});
