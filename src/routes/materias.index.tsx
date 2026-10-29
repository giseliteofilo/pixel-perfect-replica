import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { BookOpen, LayoutGrid, List, Pencil, Plus, Trash2, Search } from "lucide-react";
import { deleteSubject, updateSettings, useAppState } from "@/lib/store";
import { subjectProgress } from "@/lib/progress";
import { fmtDate } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/app/AppShell";
import { SubjectDialog } from "@/components/app/SubjectDialog";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";
import { SubjectIcon } from "@/components/app/subject-icons";
import { ProgressBar } from "@/components/app/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Subject } from "@/lib/types";

export const Route = createFileRoute("/materias/")({
  head: () => ({
    meta: [
      { title: "Minhas Matérias — Planejador de Estudos" },
      { name: "description", content: "Cadastre e acompanhe o progresso de cada matéria." },
      { property: "og:title", content: "Minhas Matérias — Planejador de Estudos" },
      { property: "og:description", content: "Cadastre e acompanhe o progresso de cada matéria." },
    ],
  }),
  component: Materias,
});

function Materias() {
  const { subjects, activities, settings } = useAppState();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [del, setDel] = useState<Subject | null>(null);
  const [q, setQ] = useState("");
  const view = settings.preferredSubjectView;
  const list = [...subjects]
    .filter((s) => s.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const actions = (s: Subject) => (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Editar" onClick={(e) => { e.preventDefault(); setEditing(s); }}><Pencil className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Excluir" onClick={(e) => { e.preventDefault(); setDel(s); }}><Trash2 className="h-4 w-4" /></Button>
    </div>
  );

  return (
    <div>
      <PageHeader title="Minhas Matérias" subtitle={`${subjects.length} matéria(s) cadastrada(s)`} actions={
        <>
          <div className="flex rounded-md border border-input p-0.5">
            <Button size="sm" variant={view === "cards" ? "secondary" : "ghost"} aria-label="Cards" onClick={() => updateSettings({ preferredSubjectView: "cards" })}><LayoutGrid className="h-4 w-4" /></Button>
            <Button size="sm" variant={view === "list" ? "secondary" : "ghost"} aria-label="Lista" onClick={() => updateSettings({ preferredSubjectView: "list" })}><List className="h-4 w-4" /></Button>
          </div>
          <Button variant="hero" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" />Nova matéria</Button>
        </>
      } />

      {subjects.length > 0 && (
        <div className="relative mb-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar matérias…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}

      {subjects.length === 0 ? (
        <EmptyState icon={BookOpen} title="Nenhuma matéria cadastrada" text="Crie suas matérias para organizar atividades e acompanhar seu progresso." action={<Button variant="hero" onClick={() => setOpen(true)}>Criar primeira matéria</Button>} />
      ) : view === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => {
            const p = subjectProgress(activities, s.id);
            return (
              <Link key={s.id} to="/materias/$id" params={{ id: s.id }} className="card-surface group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-primary/40 animate-in-up">
                <div className="flex items-start justify-between">
                  <SubjectIcon icon={s.icon} color={s.color} size="lg" />
                  {actions(s)}
                </div>
                <h3 className="mt-4 text-lg font-bold text-foreground">{s.name}</h3>
                <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">{s.description || "Sem descrição"}</p>
                <div className="mt-4 flex justify-between text-xs text-muted-foreground"><span>{p.done} de {p.total} concluídas</span><span className="font-semibold text-foreground">{p.percent}%</span></div>
                <div className="mt-2"><ProgressBar value={p.percent} color={s.color} /></div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card-surface divide-y divide-border">
          {list.map((s) => {
            const p = subjectProgress(activities, s.id);
            return (
              <Link key={s.id} to="/materias/$id" params={{ id: s.id }} className="flex items-center gap-4 p-4 hover:bg-muted/50">
                <SubjectIcon icon={s.icon} color={s.color} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">Criada em {fmtDate(s.createdAt)} · {p.total} atividade(s)</p>
                </div>
                <div className="hidden w-40 sm:block"><ProgressBar value={p.percent} color={s.color} /></div>
                <span className="w-10 text-right text-sm font-semibold text-foreground">{p.percent}%</span>
                {actions(s)}
              </Link>
            );
          })}
        </div>
      )}

      <SubjectDialog open={open} onOpenChange={setOpen} />
      <SubjectDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} subject={editing} />
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title="Excluir matéria?"
        description={`“${del?.name ?? ""}” e todas as suas atividades serão removidas. As sessões de estudo continuarão no histórico.`}
        onConfirm={() => { if (del) { deleteSubject(del.id); toast.success("Matéria excluída"); } }} />
    </div>
  );
}
