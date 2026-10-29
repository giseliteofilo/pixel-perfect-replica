import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { endOfDay, endOfMonth, format, startOfDay, startOfMonth, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { BarChart3 } from "lucide-react";
import { useAppState } from "@/lib/store";
import { fmtDuration, fmtMinutes, STATUS_LABEL } from "@/lib/format";
import { overallProgress, progressAt, realSecondsFor } from "@/lib/progress";
import { periodStart, rangeDays, secondsOnDay, weekData } from "@/lib/stats";
import { PageHeader, EmptyState } from "@/components/app/AppShell";
import { ProgressBar } from "@/components/app/badges";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Status } from "@/lib/types";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios e Estatísticas — Planejador de Estudos" },
      { name: "description", content: "Resumos diários, semanais e mensais e evolução do progresso." },
      { property: "og:title", content: "Relatórios e Estatísticas — Planejador de Estudos" },
      { property: "og:description", content: "Resumos diários, semanais e mensais e evolução do progresso." },
    ],
  }),
  component: Relatorios,
});

const tip = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)" };
const axis = { tickLine: false, axisLine: false, fontSize: 12, stroke: "var(--muted-foreground)" } as const;

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return <div className={`card-surface p-5 ${className}`}><h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>{children}</div>;
}

function Relatorios() {
  const { sessions: all, activities: allActs, subjects, statusHistory, settings } = useAppState();
  const [period, setPeriod] = useState("30");
  const [subject, setSubject] = useState("all");

  const sessions = useMemo(() => {
    const st = periodStart(period);
    return all.filter((s) => (subject === "all" || s.subjectId === subject) && (!st || new Date(s.startedAt) >= st));
  }, [all, period, subject]);
  const acts = subject === "all" ? allActs : allActs.filter((a) => a.subjectId === subject);
  const subjSessions = subject === "all" ? all : all.filter((s) => s.subjectId === subject);

  const today = new Date();
  const todaySec = secondsOnDay(subjSessions, today);
  const todayCount = subjSessions.filter((s) => format(new Date(s.startedAt), "yyyy-MM-dd") === format(today, "yyyy-MM-dd")).length;
  const week = weekData(subjSessions, settings.weekStartsOn);
  const weekSec = week.reduce((n, d) => n + d.sec, 0);
  const monthDays = rangeDays(startOfMonth(today), endOfMonth(today)).map((d) => {
    const sec = secondsOnDay(subjSessions, d);
    return { label: format(d, "dd"), horas: Math.round((sec / 3600) * 100) / 100, sec };
  });
  const monthSec = monthDays.reduce((n, d) => n + d.sec, 0);

  const bySubject = useMemo(() => {
    const m = new Map<string, { name: string; color: string; sec: number }>();
    for (const s of sessions) {
      const k = s.subjectId ?? `n:${s.subjectNameSnapshot}`;
      const cur = m.get(k) ?? { name: s.subjectNameSnapshot, color: s.subjectColorSnapshot, sec: 0 };
      cur.sec += s.durationSeconds;
      m.set(k, cur);
    }
    return [...m.values()].sort((a, b) => b.sec - a.sec).map((x) => ({ ...x, horas: Math.round((x.sec / 3600) * 100) / 100 }));
  }, [sessions]);

  const statusCounts = (["pending", "in_progress", "done"] as Status[]).map((s) => ({ s, n: acts.filter((a) => a.status === s).length }));
  const estVsReal = acts
    .filter((a) => a.estimatedMinutes)
    .map((a) => ({ name: a.title.length > 18 ? a.title.slice(0, 18) + "…" : a.title, estimado: a.estimatedMinutes!, real: Math.round(realSecondsFor(all, a.id) / 60) }))
    .slice(0, 12);

  const evolution = useMemo(() => {
    const st = periodStart(period) ?? (statusHistory.length ? startOfDay(new Date(statusHistory.reduce((m, h) => (h.at < m ? h.at : m), statusHistory[0].at))) : subDays(today, 29));
    return rangeDays(st, today).map((d) => ({
      label: format(d, "dd/MM", { locale: ptBR }),
      progresso: progressAt(acts, statusHistory, endOfDay(d).toISOString()),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acts, statusHistory, period]);

  const totalSec = sessions.reduce((n, s) => n + s.durationSeconds, 0);
  const prog = overallProgress(acts);

  if (all.length === 0 && allActs.length === 0) {
    return <div><PageHeader title="Relatórios e Estatísticas" /><EmptyState icon={BarChart3} title="Ainda não há dados" text="Cadastre atividades e registre sessões de estudo para ver seus relatórios." /></div>;
  }

  return (
    <div>
      <PageHeader title="Relatórios e Estatísticas" subtitle="Baseados nos seus dados reais." actions={
        <>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40" aria-label="Período"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="7">Últimos 7 dias</SelectItem><SelectItem value="30">Últimos 30 dias</SelectItem><SelectItem value="90">Últimos 90 dias</SelectItem><SelectItem value="all">Todo o período</SelectItem></SelectContent>
          </Select>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="w-48" aria-label="Matéria"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas as matérias</SelectItem>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </>
      } />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Hoje", fmtDuration(todaySec), `${todayCount} sessão(ões)`],
          ["Esta semana", fmtDuration(weekSec), "desde " + format(week[0].date, "dd/MM")],
          ["Este mês", fmtDuration(monthSec), format(today, "MMMM", { locale: ptBR })],
          ["No período", fmtDuration(totalSec), `${sessions.length} sessão(ões)`],
        ].map(([l, v, sub]) => (
          <div key={l} className="card-surface p-5"><p className="text-xs text-muted-foreground">{l}</p><p className="font-display text-2xl font-bold text-foreground">{v}</p><p className="text-xs text-muted-foreground">{sub}</p></div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Resumo semanal (horas)">
          <div className="h-56"><ResponsiveContainer><BarChart data={week}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" /><XAxis dataKey="label" {...axis} /><YAxis {...axis} width={30} /><Tooltip contentStyle={tip} cursor={{ fill: "var(--muted)" }} /><Bar dataKey="horas" fill="var(--primary)" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>
        <Card title="Resumo mensal (horas por dia)">
          <div className="h-56"><ResponsiveContainer><BarChart data={monthDays}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" /><XAxis dataKey="label" {...axis} interval={2} /><YAxis {...axis} width={30} /><Tooltip contentStyle={tip} cursor={{ fill: "var(--muted)" }} /><Bar dataKey="horas" fill="var(--chart-2)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>
        <Card title="Horas por matéria (período)">
          {bySubject.length === 0 ? <p className="text-sm text-muted-foreground">Sem sessões no período.</p> : (
            <div className="space-y-3">
              {bySubject.map((s) => (
                <div key={s.name}>
                  <div className="mb-1 flex justify-between text-sm"><span className="text-foreground">{s.name}</span><span className="font-semibold text-foreground">{fmtDuration(s.sec)}</span></div>
                  <ProgressBar value={Math.round((s.sec / bySubject[0].sec) * 100)} color={s.color} />
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Situação das atividades">
          <div className="grid grid-cols-3 gap-3">
            {statusCounts.map(({ s, n }) => (
              <div key={s} className="rounded-xl bg-muted/60 p-4 text-center"><p className="font-display text-3xl font-bold text-foreground">{n}</p><p className="text-xs text-muted-foreground">{STATUS_LABEL[s]}</p></div>
            ))}
          </div>
          <div className="mt-5"><div className="mb-1 flex justify-between text-sm"><span className="text-muted-foreground">Progresso</span><span className="font-semibold text-foreground">{prog.percent}%</span></div><ProgressBar value={prog.percent} /></div>
        </Card>
        <Card title="Tempo estimado × tempo real (minutos)">
          {estVsReal.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma atividade com tempo estimado.</p> : (
            <div className="h-64"><ResponsiveContainer><BarChart data={estVsReal}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" /><XAxis dataKey="name" {...axis} fontSize={10} /><YAxis {...axis} width={35} /><Tooltip contentStyle={tip} formatter={(v: number) => fmtMinutes(v) || "0min"} cursor={{ fill: "var(--muted)" }} /><Legend /><Bar dataKey="estimado" name="Estimado" fill="var(--chart-2)" radius={[6, 6, 0, 0]} /><Bar dataKey="real" name="Real" fill="var(--primary)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
          )}
        </Card>
        <Card title="Evolução do progresso (%)">
          <div className="h-64"><ResponsiveContainer><LineChart data={evolution}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" /><XAxis dataKey="label" {...axis} minTickGap={24} /><YAxis {...axis} width={35} domain={[0, 100]} /><Tooltip contentStyle={tip} formatter={(v: number) => `${v}%`} /><Line type="monotone" dataKey="progresso" name="Progresso" stroke="var(--primary)" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div>
        </Card>
      </div>
    </div>
  );
}
