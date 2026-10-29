import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { History, Trash2, X } from "lucide-react";
import { deleteSession, useAppState } from "@/lib/store";
import { fmtDate, fmtDuration, fmtTime, MODE_LABEL } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/app/AppShell";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StudySession } from "@/lib/types";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de Estudos — Planejador de Estudos" },
      { name: "description", content: "Todas as suas sessões de estudo registradas." },
      { property: "og:title", content: "Histórico de Estudos — Planejador de Estudos" },
      { property: "og:description", content: "Todas as suas sessões de estudo registradas." },
    ],
  }),
  component: Historico,
});

const E = { from: "", to: "", subject: "all", activity: "all", mode: "all" };

function Historico() {
  const { sessions } = useAppState();
  const [f, setF] = useState(E);
  const [del, setDel] = useState<StudySession | null>(null);
  const subjOpts = useMemo(() => {
    const m = new Map<string, string>();
    sessions.forEach((s) => m.set(s.subjectId ?? `name:${s.subjectNameSnapshot}`, s.subjectNameSnapshot));
    return [...m];
  }, [sessions]);
  const actOpts = useMemo(() => {
    const m = new Map<string, string>();
    sessions.forEach((s) => m.set(s.activityId ?? `name:${s.activityNameSnapshot}`, s.activityNameSnapshot));
    return [...m];
  }, [sessions]);

  const list = sessions
    .filter((s) => {
      const d = format(new Date(s.startedAt), "yyyy-MM-dd");
      if (f.from && d < f.from) return false;
      if (f.to && d > f.to) return false;
      if (f.subject !== "all" && (s.subjectId ?? `name:${s.subjectNameSnapshot}`) !== f.subject) return false;
      if (f.activity !== "all" && (s.activityId ?? `name:${s.activityNameSnapshot}`) !== f.activity) return false;
      if (f.mode !== "all" && s.mode !== f.mode) return false;
      return true;
    })
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const total = list.reduce((n, s) => n + s.durationSeconds, 0);
  const dirty = JSON.stringify(f) !== JSON.stringify(E);

  return (
    <div>
      <PageHeader title="Histórico de Estudos" subtitle={`${list.length} sessão(ões) · ${fmtDuration(total)} no total`} />
      {sessions.length === 0 ? (
        <EmptyState icon={History} title="Nenhuma sessão registrada" text="Use o cronômetro para registrar suas sessões de estudo. Elas aparecerão aqui." />
      ) : (
        <>
          <div className="card-surface mb-4 grid grid-cols-2 gap-2 p-4 md:grid-cols-6">
            <Input type="date" aria-label="De" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
            <Input type="date" aria-label="Até" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
            <Select value={f.subject} onValueChange={(v) => setF({ ...f, subject: v })}>
              <SelectTrigger aria-label="Matéria"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todas as matérias</SelectItem>{subjOpts.map(([k, n]) => <SelectItem key={k} value={k}>{n}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={f.activity} onValueChange={(v) => setF({ ...f, activity: v })}>
              <SelectTrigger aria-label="Atividade"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todas as atividades</SelectItem>{actOpts.map(([k, n]) => <SelectItem key={k} value={k}>{n}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={f.mode} onValueChange={(v) => setF({ ...f, mode: v })}>
              <SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos os tipos</SelectItem><SelectItem value="simple">Simples</SelectItem><SelectItem value="pomodoro">Pomodoro</SelectItem></SelectContent>
            </Select>
            {dirty && <Button variant="ghost" onClick={() => setF(E)}><X className="mr-1 h-4 w-4" />Limpar</Button>}
          </div>
          <div className="card-surface overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="p-3">Data</th><th className="p-3">Início</th><th className="p-3">Término</th><th className="p-3">Matéria</th><th className="p-3">Atividade</th><th className="p-3">Duração</th><th className="p-3">Tipo</th><th className="p-3" /></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/40">
                    <td className="p-3 text-foreground">{fmtDate(s.startedAt)}</td>
                    <td className="p-3 text-muted-foreground">{fmtTime(s.startedAt)}</td>
                    <td className="p-3 text-muted-foreground">{s.endedAt ? fmtTime(s.endedAt) : "—"}</td>
                    <td className="p-3"><span className="inline-flex items-center gap-2 text-foreground"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.subjectColorSnapshot }} />{s.subjectNameSnapshot}{!s.subjectId && <span className="text-xs text-muted-foreground">(excluída)</span>}</span></td>
                    <td className="p-3 text-foreground">{s.activityNameSnapshot}{!s.activityId && <span className="ml-1 text-xs text-muted-foreground">(excluída)</span>}</td>
                    <td className="p-3 font-semibold text-foreground">{fmtDuration(s.durationSeconds)}</td>
                    <td className="p-3 text-muted-foreground">{MODE_LABEL[s.mode]}{s.cycleStatus && <span className={`ml-1 text-xs font-semibold ${s.cycleStatus === "complete" ? "text-success" : "text-destructive"}`}>{s.cycleStatus === "complete" ? "completo" : "incompleto"}</span>}</td>
                    <td className="p-3 text-right"><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Excluir sessão" onClick={() => setDel(s)}><Trash2 className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma sessão corresponde aos filtros.</p>}
          </div>
        </>
      )}
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title="Excluir sessão?" description="O tempo desta sessão deixará de contar nos totais e relatórios."
        onConfirm={() => { if (del) { deleteSession(del.id); toast.success("Sessão excluída"); } }} />
    </div>
  );
}
