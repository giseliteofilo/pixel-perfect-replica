import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpen, ListChecks, CheckCircle2, TrendingUp, Clock, AlertTriangle, CalendarClock, Timer, Search, Flag } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAppState } from "@/lib/store";
import { isOverdue, overallProgress, subjectProgress, todayKey } from "@/lib/progress";
import { fmtDate, fmtDuration, fmtTime, PRIORITY_LABEL } from "@/lib/format";
import { weekData } from "@/lib/stats";
import { PageHeader, EmptyState } from "@/components/app/AppShell";
import { ProgressBar, PriorityBadge, OverdueBadge } from "@/components/app/badges";
import { SubjectIcon } from "@/components/app/subject-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Activity, Priority } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Planejador de Estudos" },
      { name: "description", content: "Visão geral do seu progresso, prazos e horas estudadas." },
      { property: "og:title", content: "Dashboard — Planejador de Estudos" },
      { property: "og:description", content: "Visão geral do seu progresso, prazos e horas estudadas." },
    ],
  }),
  component: Dashboard,
});

function Stat({ icon: Icon, label, value, tone = "primary" }: { icon: typeof BookOpen; label: string; value: string; tone?: "primary" | "success" | "warning" }) {
  const t = tone === "success" ? "bg-success/15 text-success" : tone === "warning" ? "bg-warning/20 text-foreground" : "bg-accent text-primary";
  return (
    <div className="card-surface flex items-center gap-4 p-5 animate-in-up">
      <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${t}`}><Icon className="h-5 w-5" /></span>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="font-display text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function MiniList({ title, icon: Icon, items, empty, subName }: { title: string; icon: typeof BookOpen; items: Activity[]; empty: string; subName: (id: string) => string }) {
  return (
    <div className="card-surface p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Icon className="h-4 w-4 text-primary" />{title}<span className="ml-auto text-xs text-muted-foreground">{items.length}</span></h3>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : (
        <ul className="space-y-2">
          {items.slice(0, 5).map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
                <p className="text-xs text-muted-foreground">{subName(a.subjectId)}{a.dueDate && ` · ${fmtDate(a.dueDate)}`}</p>
              </div>
              <div className="flex shrink-0 gap-1"><PriorityBadge p={a.priority} />{isOverdue(a) && <OverdueBadge />}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Dashboard() {
  const { subjects, activities, sessions, settings, timer } = useAppState();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [quick, setQuick] = useState("");
  const today = todayKey();
  const prog = overallProgress(activities);
  const totalSec = sessions.reduce((n, s) => n + s.durationSeconds, 0);
  const subName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "—";
  const open = activities.filter((a) => a.status !== "done");
  const todayList = open.filter((a) => a.dueDate === today);
  const overdue = open.filter((a) => isOverdue(a, today));
  const upcoming = open.filter((a) => a.dueDate && a.dueDate > today).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  const byPriority = (["high", "medium", "low"] as Priority[]).map((p) => ({ p, n: open.filter((a) => a.priority === p).length }));
  const week = useMemo(() => weekData(sessions, settings.weekStartsOn), [sessions, settings.weekStartsOn]);
  const results = q ? activities.filter((a) => a.title.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
  const recent = [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 6);

  return (
    <div>
      <PageHeader title="Olá! Vamos estudar?" subtitle="Acompanhe seu progresso e seus próximos prazos." actions={
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar atividades…" value={q} onChange={(e) => setQ(e.target.value)} />
          {q && (
            <div className="card-surface absolute right-0 top-11 z-10 w-full p-2">
              {results.length === 0 ? <p className="p-2 text-sm text-muted-foreground">Nada encontrado.</p> : results.map((a) => (
                <Link key={a.id} to="/materias/$id" params={{ id: a.subjectId }} className="block rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                  <span className="font-medium text-foreground">{a.title}</span> <span className="text-xs text-muted-foreground">· {subName(a.subjectId)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      } />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat icon={BookOpen} label="Matérias" value={String(subjects.length)} />
        <Stat icon={ListChecks} label="Atividades" value={String(activities.length)} />
        <Stat icon={CheckCircle2} label="Concluídas" value={String(prog.done)} tone="success" />
        <Stat icon={TrendingUp} label="Progresso geral" value={`${prog.percent}%`} />
        <Stat icon={Clock} label="Horas estudadas" value={fmtDuration(totalSec)} tone="warning" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card-surface p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Horas estudadas nesta semana</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={week}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" width={30} />
                <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(_v, _n, p) => [fmtDuration(p.payload.sec), "Estudo"]} />
                <Bar dataKey="horas" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card-surface flex flex-col bg-gradient-primary p-5 text-primary-foreground">
          <Timer className="h-6 w-6" />
          <h3 className="mt-3 text-lg font-bold">Acesso rápido ao cronômetro</h3>
          {timer ? (
            <>
              <p className="mt-1 text-sm opacity-90">Há uma sessão ativa em andamento.</p>
              <Button asChild variant="secondary" className="mt-auto"><Link to="/cronometro">Ver sessão atual</Link></Button>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm opacity-90">Selecione uma atividade para começar.</p>
              <div className="mt-4 space-y-2">
                <Select value={quick} onValueChange={setQuick}>
                  <SelectTrigger className="bg-card text-card-foreground"><SelectValue placeholder="Escolha a atividade" /></SelectTrigger>
                  <SelectContent>{open.map((a) => <SelectItem key={a.id} value={a.id}>{a.title} — {subName(a.subjectId)}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="secondary" className="w-full" disabled={!quick} onClick={() => navigate({ to: "/cronometro", search: { atividade: quick } })}>Ir para o cronômetro</Button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MiniList title="Previstas para hoje" icon={CalendarClock} items={todayList} empty="Nenhuma atividade para hoje." subName={subName} />
        <MiniList title="Atrasadas" icon={AlertTriangle} items={overdue} empty="Tudo em dia!" subName={subName} />
        <MiniList title="Próximos prazos" icon={CalendarClock} items={upcoming} empty="Sem prazos futuros." subName={subName} />
        <div className="card-surface p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Flag className="h-4 w-4 text-primary" />Abertas por prioridade</h3>
          <div className="space-y-3">
            {byPriority.map(({ p, n }) => (
              <div key={p} className="flex items-center justify-between">
                <PriorityBadge p={p} />
                <span className="font-display text-lg font-bold text-foreground">{n}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Sem prioridade: {open.filter((a) => !a.priority).length} · {PRIORITY_LABEL.high} primeiro!</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Progresso das matérias</h3>
            <Link to="/materias" className="text-xs font-semibold text-primary">Ver todas</Link>
          </div>
          {subjects.length === 0 ? (
            <EmptyState icon={BookOpen} title="Sem matérias" text="Comece cadastrando suas matérias." action={<Button asChild variant="hero"><Link to="/materias">Cadastrar matéria</Link></Button>} />
          ) : (
            <div className="space-y-4">
              {subjects.map((s) => {
                const p = subjectProgress(activities, s.id);
                return (
                  <Link key={s.id} to="/materias/$id" params={{ id: s.id }} className="flex items-center gap-3 rounded-xl p-1 hover:bg-muted/60">
                    <SubjectIcon icon={s.icon} color={s.color} />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between text-sm"><span className="truncate font-medium text-foreground">{s.name}</span><span className="text-muted-foreground">{p.done}/{p.total} · {p.percent}%</span></div>
                      <div className="mt-1.5"><ProgressBar value={p.percent} color={s.color} /></div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        <div className="card-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Histórico recente</h3>
            <Link to="/historico" className="text-xs font-semibold text-primary">Ver histórico</Link>
          </div>
          {recent.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma sessão registrada. Use o cronômetro para registrar seu tempo de estudo.</p> : (
            <ul className="divide-y divide-border">
              {recent.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.subjectColorSnapshot }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{s.activityNameSnapshot}</p>
                    <p className="text-xs text-muted-foreground">{s.subjectNameSnapshot} · {fmtDate(s.startedAt)} {fmtTime(s.startedAt)}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{fmtDuration(s.durationSeconds)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
