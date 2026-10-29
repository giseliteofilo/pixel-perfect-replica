import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  CalendarDays, Clock, LayoutList, Columns3, MoreVertical, Pencil, Trash2, CheckCircle2, RotateCcw, Play, Search, X, ListChecks,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { deleteActivity, setActivityStatus, updateSettings, useAppState } from "@/lib/store";
import type { Activity, Status, Subject } from "@/lib/types";
import { PRIORITY_RANK, STATUS_LABEL, fmtDate, fmtDuration, fmtMinutes } from "@/lib/format";
import { isOverdue, realSecondsFor, todayKey } from "@/lib/progress";
import { OverdueBadge, PriorityBadge, StatusBadge } from "./badges";
import { SubjectIcon } from "./subject-icons";
import { ActivityDialog } from "./ActivityDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { EmptyState } from "./AppShell";

export type SortKey = "recent" | "oldest" | "due" | "priority" | "alpha" | "status" | "estimate";
const SORT_LABEL: Record<SortKey, string> = {
  recent: "Mais recentes primeiro",
  oldest: "Mais antigas primeiro",
  due: "Data prevista mais próxima",
  priority: "Maior prioridade primeiro",
  alpha: "Ordem alfabética",
  status: "Status",
  estimate: "Maior tempo estimado",
};
const STATUS_ORDER: Record<Status, number> = { pending: 0, in_progress: 1, done: 2 };

export interface Filters {
  q: string; status: string; priority: string; subject: string; overdue: boolean; from: string; to: string;
}
const EMPTY: Filters = { q: "", status: "all", priority: "all", subject: "all", overdue: false, from: "", to: "" };

export function applyFilters(list: Activity[], f: Filters, sort: SortKey) {
  const today = todayKey();
  const r = list.filter((a) => {
    if (f.q && !a.title.toLowerCase().includes(f.q.toLowerCase())) return false;
    if (f.status !== "all" && a.status !== f.status) return false;
    if (f.priority !== "all" && (f.priority === "none" ? a.priority !== null : a.priority !== f.priority)) return false;
    if (f.subject !== "all" && a.subjectId !== f.subject) return false;
    if (f.overdue && !isOverdue(a, today)) return false;
    if (f.from && (!a.dueDate || a.dueDate < f.from)) return false;
    if (f.to && (!a.dueDate || a.dueDate > f.to)) return false;
    return true;
  });
  const cmp: Record<SortKey, (a: Activity, b: Activity) => number> = {
    recent: (a, b) => b.createdAt.localeCompare(a.createdAt),
    oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
    due: (a, b) => (a.dueDate && b.dueDate ? a.dueDate.localeCompare(b.dueDate) : a.dueDate ? -1 : b.dueDate ? 1 : 0),
    priority: (a, b) => (b.priority ? PRIORITY_RANK[b.priority] : 0) - (a.priority ? PRIORITY_RANK[a.priority] : 0),
    alpha: (a, b) => a.title.localeCompare(b.title, "pt-BR"),
    status: (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
    estimate: (a, b) => (b.estimatedMinutes ?? -1) - (a.estimatedMinutes ?? -1),
  };
  return [...r].sort(cmp[sort]);
}

function ActivityMenu({ a, onEdit, onDelete }: { a: Activity; onEdit: () => void; onDelete: () => void }) {
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ações"><MoreVertical className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {a.status !== "done" ? (
          <DropdownMenuItem onClick={() => { setActivityStatus(a.id, "done"); toast.success("Atividade concluída"); }}>
            <CheckCircle2 className="mr-2 h-4 w-4" />Concluir
          </DropdownMenuItem>
        ) : (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger><RotateCcw className="mr-2 h-4 w-4" />Reabrir como…</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => setActivityStatus(a.id, "pending")}>Pendente</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActivityStatus(a.id, "in_progress")}>Em andamento</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {a.status === "pending" && (
          <DropdownMenuItem onClick={() => setActivityStatus(a.id, "in_progress")}>Marcar em andamento</DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => navigate({ to: "/cronometro", search: { atividade: a.id } })}>
          <Play className="mr-2 h-4 w-4" />Estudar agora
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={onDelete}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ActivityRow({ a, subject, realSec, compact, onEdit, onDelete }: {
  a: Activity; subject?: Subject; realSec: number; compact?: boolean; onEdit: () => void; onDelete: () => void;
}) {
  const overdue = isOverdue(a);
  const diff = a.estimatedMinutes != null && realSec > 0 ? Math.round(realSec / 60) - a.estimatedMinutes : null;
  return (
    <div className={`card-surface flex gap-3 p-4 transition hover:border-primary/40 ${a.status === "done" ? "opacity-80" : ""}`}>
      <Checkbox
        className="mt-1"
        checked={a.status === "done"}
        aria-label={a.status === "done" ? "Reabrir como pendente" : "Concluir"}
        onCheckedChange={(c) => setActivityStatus(a.id, c ? "done" : "pending")}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`font-semibold text-foreground ${a.status === "done" ? "line-through decoration-muted-foreground/60" : ""}`}>{a.title}</p>
          <ActivityMenu a={a} onEdit={onEdit} onDelete={onDelete} />
        </div>
        {!compact && a.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{a.description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {subject && (
            <Link to="/materias/$id" params={{ id: subject.id }} className="inline-flex items-center gap-1.5 font-medium hover:text-foreground">
              <SubjectIcon icon={subject.icon} color={subject.color} size="sm" />{subject.name}
            </Link>
          )}
          <StatusBadge s={a.status} />
          <PriorityBadge p={a.priority} />
          {overdue && <OverdueBadge />}
          {a.dueDate && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{fmtDate(a.dueDate)}</span>}
          {(a.estimatedMinutes != null || realSec > 0) && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {a.estimatedMinutes != null && `Est. ${fmtMinutes(a.estimatedMinutes)}`}
              {a.estimatedMinutes != null && realSec > 0 && " · "}
              {realSec > 0 && `Real ${fmtDuration(realSec)}`}
              {diff !== null && (
                <span className={diff > 0 ? "text-destructive" : "text-success"}>
                  ({diff > 0 ? "+" : diff < 0 ? "−" : "±"}{fmtMinutes(Math.abs(diff)) || "0min"})
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function ActivitiesBrowser({ fixedSubjectId }: { fixedSubjectId?: string }) {
  const { activities, subjects, sessions, settings } = useAppState();
  const [f, setF] = useState<Filters>(EMPTY);
  const [sort, setSort] = useState<SortKey>("due");
  const [editing, setEditing] = useState<Activity | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Activity | null>(null);
  const [dragOver, setDragOver] = useState<Status | null>(null);
  const view = settings.preferredActivityView;

  const base = useMemo(() => (fixedSubjectId ? activities.filter((a) => a.subjectId === fixedSubjectId) : activities), [activities, fixedSubjectId]);
  const list = useMemo(() => applyFilters(base, f, sort), [base, f, sort]);
  const subMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const realMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sessions) if (s.activityId) m.set(s.activityId, (m.get(s.activityId) ?? 0) + s.durationSeconds);
    return m;
  }, [sessions]);
  const dirty = JSON.stringify(f) !== JSON.stringify(EMPTY);
  const upd = (p: Partial<Filters>) => setF((x) => ({ ...x, ...p }));

  const row = (a: Activity, compact?: boolean) => (
    <ActivityRow key={a.id} a={a} subject={subMap.get(a.subjectId)} realSec={realMap.get(a.id) ?? 0} compact={compact}
      onEdit={() => setEditing(a)} onDelete={() => setToDelete(a)} />
  );

  return (
    <div className="space-y-4">
      <div className="card-surface space-y-3 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Pesquisar por título…" value={f.q} onChange={(e) => upd({ q: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-[220px]" aria-label="Ordenação"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(SORT_LABEL) as SortKey[]).map((k) => <SelectItem key={k} value={k}>{SORT_LABEL[k]}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex rounded-md border border-input p-0.5">
              <Button size="sm" variant={view === "list" ? "secondary" : "ghost"} aria-label="Lista" onClick={() => updateSettings({ preferredActivityView: "list" })}><LayoutList className="h-4 w-4" /></Button>
              <Button size="sm" variant={view === "kanban" ? "secondary" : "ghost"} aria-label="Kanban" onClick={() => updateSettings({ preferredActivityView: "kanban" })}><Columns3 className="h-4 w-4" /></Button>
            </div>
            <Button variant="hero" onClick={() => setCreating(true)} disabled={subjects.length === 0}>Nova atividade</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Select value={f.status} onValueChange={(v) => upd({ status: v })}>
            <SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={f.priority} onValueChange={(v) => upd({ priority: v })}>
            <SelectTrigger aria-label="Prioridade"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prioridades</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="none">Sem prioridade</SelectItem>
            </SelectContent>
          </Select>
          {!fixedSubjectId && (
            <Select value={f.subject} onValueChange={(v) => upd({ subject: v })}>
              <SelectTrigger aria-label="Matéria"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as matérias</SelectItem>
                {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Input type="date" aria-label="Prazo a partir de" value={f.from} onChange={(e) => upd({ from: e.target.value })} />
          <Input type="date" aria-label="Prazo até" value={f.to} onChange={(e) => upd({ to: e.target.value })} />
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox checked={f.overdue} onCheckedChange={(c) => upd({ overdue: !!c })} />Atrasadas
            </label>
            {dirty && <Button size="sm" variant="ghost" onClick={() => setF(EMPTY)}><X className="mr-1 h-4 w-4" />Limpar</Button>}
          </div>
        </div>
      </div>

      {base.length === 0 ? (
        <EmptyState icon={ListChecks} title="Nenhuma atividade ainda"
          text={subjects.length ? "Crie sua primeira atividade para começar a planejar seus estudos." : "Cadastre uma matéria primeiro e depois adicione atividades a ela."}
          action={subjects.length ? <Button variant="hero" onClick={() => setCreating(true)}>Criar atividade</Button> : <Button asChild variant="hero"><Link to="/materias">Ir para matérias</Link></Button>} />
      ) : list.length === 0 ? (
        <EmptyState icon={Search} title="Nenhum resultado" text="Nenhuma atividade corresponde aos filtros atuais." action={<Button variant="outline" onClick={() => setF(EMPTY)}>Limpar filtros</Button>} />
      ) : view === "list" ? (
        <div className="space-y-2.5">{list.map((a) => row(a))}</div>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="grid min-w-[840px] grid-cols-3 gap-4">
            {(["pending", "in_progress", "done"] as Status[]).map((st) => {
              const col = list.filter((a) => a.status === st);
              return (
                <div
                  key={st}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(st); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(null);
                    const id = e.dataTransfer.getData("text/plain");
                    if (id) setActivityStatus(id, st);
                  }}
                  className={`rounded-2xl border-2 border-dashed p-3 transition ${dragOver === st ? "border-primary bg-accent/50" : "border-transparent bg-muted/60"}`}
                >
                  <div className="mb-3 flex items-center justify-between px-1">
                    <h3 className="text-sm font-semibold text-foreground">{STATUS_LABEL[st]}</h3>
                    <span className="rounded-full bg-card px-2 py-0.5 text-xs font-semibold text-muted-foreground">{col.length}</span>
                  </div>
                  <div className="min-h-24 space-y-2.5">
                    {col.map((a) => (
                      <div key={a.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", a.id)} className="cursor-grab active:cursor-grabbing">
                        {row(a, true)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ActivityDialog open={creating} onOpenChange={setCreating} defaultSubjectId={fixedSubjectId} />
      <ActivityDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} activity={editing} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir atividade?"
        description={`“${toDelete?.title ?? ""}” será removida. As sessões de estudo registradas continuarão no histórico.`}
        onConfirm={() => { if (toDelete) { deleteActivity(toDelete.id); toast.success("Atividade excluída"); } }}
      />
    </div>
  );
}

export { realSecondsFor };
