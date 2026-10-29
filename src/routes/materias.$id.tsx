import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Timer, Trash2 } from "lucide-react";
import { deleteSubject, useAppState } from "@/lib/store";
import { subjectProgress } from "@/lib/progress";
import { fmtDate, fmtDuration, fmtTime, MODE_LABEL } from "@/lib/format";
import { SubjectIcon } from "@/components/app/subject-icons";
import { ProgressBar } from "@/components/app/badges";
import { ActivitiesBrowser } from "@/components/app/ActivitiesBrowser";
import { SubjectDialog } from "@/components/app/SubjectDialog";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";
import { EmptyState } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/materias/$id")({
  head: () => ({
    meta: [
      { title: "Matéria — Planejador de Estudos" },
      { name: "description", content: "Atividades, progresso e sessões de uma matéria." },
      { property: "og:title", content: "Matéria — Planejador de Estudos" },
      { property: "og:description", content: "Atividades, progresso e sessões de uma matéria." },
    ],
  }),
  component: MateriaPage,
});

function MateriaPage() {
  const { id } = Route.useParams();
  const { subjects, activities, sessions } = useAppState();
  const navigate = useNavigate();
  const [edit, setEdit] = useState(false);
  const [del, setDel] = useState(false);
  const s = subjects.find((x) => x.id === id);

  if (!s) {
    return <EmptyState icon={BookOpen} title="Matéria não encontrada" text="Ela pode ter sido excluída." action={<Button asChild variant="outline"><Link to="/materias">Voltar às matérias</Link></Button>} />;
  }
  const p = subjectProgress(activities, s.id);
  const subSessions = sessions.filter((x) => x.subjectId === s.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const total = subSessions.reduce((n, x) => n + x.durationSeconds, 0);
  const firstOpen = activities.find((a) => a.subjectId === s.id && a.status !== "done");

  return (
    <div className="space-y-6">
      <Link to="/materias" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Minhas Matérias</Link>
      <div className="card-surface p-6 animate-in-up">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <SubjectIcon icon={s.icon} color={s.color} size="lg" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{s.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{s.description || "Sem descrição"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Criada em {fmtDate(s.createdAt)} · Atualizada em {fmtDate(s.updatedAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="hero" onClick={() => navigate({ to: "/cronometro", search: firstOpen ? { atividade: firstOpen.id } : {} })}><Timer className="mr-1 h-4 w-4" />Cronômetro</Button>
            <Button variant="outline" onClick={() => setEdit(true)}><Pencil className="mr-1 h-4 w-4" />Editar</Button>
            <Button variant="outline" className="text-destructive" onClick={() => setDel(true)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div><p className="text-xs text-muted-foreground">Progresso</p><p className="font-display text-2xl font-bold text-foreground">{p.percent}%</p></div>
          <div><p className="text-xs text-muted-foreground">Concluídas</p><p className="font-display text-2xl font-bold text-foreground">{p.done}/{p.total}</p></div>
          <div><p className="text-xs text-muted-foreground">Tempo estudado</p><p className="font-display text-2xl font-bold text-foreground">{fmtDuration(total)}</p></div>
        </div>
        <div className="mt-4"><ProgressBar value={p.percent} color={s.color} /></div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold text-foreground">Atividades</h2>
        <ActivitiesBrowser fixedSubjectId={s.id} />
      </section>

      <section className="card-surface p-5">
        <h2 className="mb-3 text-lg font-bold text-foreground">Sessões desta matéria</h2>
        {subSessions.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma sessão registrada ainda.</p> : (
          <ul className="divide-y divide-border">
            {subSessions.slice(0, 20).map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0"><p className="truncate font-medium text-foreground">{x.activityNameSnapshot}</p><p className="text-xs text-muted-foreground">{fmtDate(x.startedAt)} {fmtTime(x.startedAt)} · {MODE_LABEL[x.mode]}{x.cycleStatus === "incomplete" ? " (incompleto)" : ""}</p></div>
                <span className="font-semibold text-foreground">{fmtDuration(x.durationSeconds)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SubjectDialog open={edit} onOpenChange={setEdit} subject={s} />
      <ConfirmDialog open={del} onOpenChange={setDel} title="Excluir matéria?" description="A matéria e suas atividades serão removidas. As sessões continuarão no histórico."
        onConfirm={() => { deleteSubject(s.id); toast.success("Matéria excluída"); navigate({ to: "/materias" }); }} />
    </div>
  );
}
