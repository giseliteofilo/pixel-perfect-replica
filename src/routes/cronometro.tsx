import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pause, Play, Square, SkipForward, Timer, Coffee, Brain } from "lucide-react";
import { z } from "zod";
import {
  elapsedSeconds, finishTimer, pauseTimer, phaseTarget, resumeTimer, startNextPhase, startTimer, useAppState,
} from "@/lib/store";
import { fmtClock, fmtDuration, fmtMinutes, MODE_LABEL, PHASE_LABEL } from "@/lib/format";
import { realSecondsFor } from "@/lib/progress";
import { PageHeader, EmptyState } from "@/components/app/AppShell";
import { useNow } from "@/components/app/hooks";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TimerMode } from "@/lib/types";

export const Route = createFileRoute("/cronometro")({
  validateSearch: z.object({ atividade: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Cronômetro — Planejador de Estudos" },
      { name: "description", content: "Cronômetro simples e Pomodoro vinculados às suas atividades." },
      { property: "og:title", content: "Cronômetro — Planejador de Estudos" },
      { property: "og:description", content: "Cronômetro simples e Pomodoro vinculados às suas atividades." },
    ],
  }),
  component: Cronometro,
});

function Cronometro() {
  const { atividade } = Route.useSearch();
  const { activities, subjects, sessions, settings, timer } = useAppState();
  const [sel, setSel] = useState(atividade ?? "");
  const [mode, setMode] = useState<TimerMode>(settings.timerPreferences.defaultMode);
  const now = useNow(250, !!timer?.running);

  useEffect(() => { if (atividade) setSel(atividade); }, [atividade]);

  const activeAct = timer ? activities.find((a) => a.id === timer.activityId) : null;
  const curId = timer?.activityId ?? sel;
  const cur = activities.find((a) => a.id === curId);
  const sub = cur ? subjects.find((s) => s.id === cur.subjectId) : null;
  const elapsed = elapsedSeconds(timer, now);
  const isPomo = (timer?.mode ?? mode) === "pomodoro";
  const target = timer && isPomo ? phaseTarget(settings, timer.phase) : 0;
  const display = timer && isPomo ? Math.max(0, target - elapsed) : elapsed;
  const ratio = timer && isPomo && target ? Math.min(1, elapsed / target) : 0;
  const isBreak = timer?.phase !== "focus" && isPomo && !!timer;
  const openActs = activities.filter((a) => a.status !== "done" || a.id === sel);
  const real = cur ? realSecondsFor(sessions, cur.id) : 0;

  const start = () => {
    if (!sel) return toast.error("Selecione uma atividade antes de iniciar.");
    const err = startTimer(sel, mode);
    if (err) toast.error(err);
  };
  const finish = () => {
    const rec = finishTimer();
    toast.success(rec ? `Sessão registrada: ${fmtDuration(rec.durationSeconds)}` : "Sessão encerrada");
  };

  if (activities.length === 0) {
    return (
      <div>
        <PageHeader title="Cronômetro" />
        <EmptyState icon={Timer} title="Nenhuma atividade disponível" text="Crie uma atividade para poder cronometrar seus estudos." action={<Button asChild variant="hero"><Link to="/atividades">Criar atividade</Link></Button>} />
      </div>
    );
  }

  const R = 120;
  const C = 2 * Math.PI * R;

  return (
    <div>
      <PageHeader title="Cronômetro" subtitle="Escolha a atividade e o modo para registrar seu tempo de estudo." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card-surface flex flex-col items-center p-6 sm:p-10">
          <div className="mb-6 flex rounded-full bg-muted p-1">
            {(["simple", "pomodoro"] as TimerMode[]).map((m) => (
              <button key={m} disabled={!!timer} onClick={() => setMode(m)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed ${(timer?.mode ?? mode) === m ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"}`}>
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>

          {isPomo && timer && (
            <span className={`mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${isBreak ? "bg-success/15 text-success" : "bg-accent text-accent-foreground"}`}>
              {isBreak ? <Coffee className="h-3.5 w-3.5" /> : <Brain className="h-3.5 w-3.5" />}
              {PHASE_LABEL[timer.phase]} · Ciclos concluídos: {timer.completedFocusCycles}
            </span>
          )}

          <div className="relative flex h-72 w-72 items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 260 260">
              <circle cx="130" cy="130" r={R} fill="none" stroke="var(--muted)" strokeWidth="12" />
              <circle cx="130" cy="130" r={R} fill="none" stroke={isBreak ? "var(--success)" : "var(--primary)"} strokeWidth="12" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={isPomo ? C * (1 - ratio) : timer?.running ? 0 : C} className="transition-[stroke-dashoffset] duration-300" />
            </svg>
            <div className="text-center">
              <p className="font-mono text-6xl font-bold tabular-nums text-foreground">{fmtClock(display)}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {!timer ? "Pronto para começar" : timer.awaitingNext ? "Etapa concluída" : timer.running ? (isPomo ? "tempo restante" : "estudando…") : "Pausado"}
              </p>
            </div>
          </div>

          {timer?.awaitingNext && (
            <div className="mt-6 w-full max-w-md rounded-2xl border border-primary/30 bg-accent p-4 text-center text-sm text-accent-foreground">
              Etapa finalizada! Próxima: <strong>{timer.nextPhase && PHASE_LABEL[timer.nextPhase]}</strong>
            </div>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {!timer && <Button size="lg" variant="hero" onClick={start}><Play className="mr-2 h-5 w-5" />Iniciar</Button>}
            {timer?.running && <Button size="lg" variant="secondary" onClick={pauseTimer}><Pause className="mr-2 h-5 w-5" />Pausar</Button>}
            {timer && !timer.running && !timer.awaitingNext && <Button size="lg" variant="hero" onClick={resumeTimer}><Play className="mr-2 h-5 w-5" />Retomar</Button>}
            {timer?.awaitingNext && <Button size="lg" variant="hero" onClick={startNextPhase}><SkipForward className="mr-2 h-5 w-5" />Iniciar próxima etapa</Button>}
            {timer && <Button size="lg" variant="outline" onClick={finish}><Square className="mr-2 h-5 w-5" />{isPomo ? "Encerrar" : "Finalizar"}</Button>}
          </div>
          {isPomo && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Concentração {settings.pomodoroPreferences.focus}min · Pausa curta {settings.pomodoroPreferences.shortBreak}min · Pausa longa {settings.pomodoroPreferences.longBreak}min a cada {settings.pomodoroPreferences.cyclesBeforeLong} ciclos
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="card-surface p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Atividade</h3>
            <Select value={curId} onValueChange={setSel} disabled={!!timer}>
              <SelectTrigger aria-label="Atividade"><SelectValue placeholder="Selecione uma atividade" /></SelectTrigger>
              <SelectContent>
                {openActs.map((a) => <SelectItem key={a.id} value={a.id}>{a.title} — {subjects.find((s) => s.id === a.subjectId)?.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {timer && <p className="mt-2 text-xs text-muted-foreground">Finalize a sessão atual para trocar de atividade.</p>}
            {cur && (
              <div className="mt-4 space-y-2 text-sm">
                <p className="flex justify-between"><span className="text-muted-foreground">Matéria</span><span className="font-medium text-foreground">{sub?.name}</span></p>
                <p className="flex justify-between"><span className="text-muted-foreground">Estimado</span><span className="font-medium text-foreground">{cur.estimatedMinutes ? fmtMinutes(cur.estimatedMinutes) : "—"}</span></p>
                <p className="flex justify-between"><span className="text-muted-foreground">Realizado</span><span className="font-medium text-foreground">{fmtDuration(real)}</span></p>
                {cur.estimatedMinutes != null && real > 0 && (() => {
                  const d = Math.round(real / 60) - cur.estimatedMinutes;
                  return <p className="flex justify-between"><span className="text-muted-foreground">Diferença</span><span className={`font-semibold ${d > 0 ? "text-destructive" : "text-success"}`}>{d > 0 ? "+" : d < 0 ? "−" : ""}{fmtMinutes(Math.abs(d)) || "0min"}</span></p>;
                })()}
              </div>
            )}
          </div>
          <div className="card-surface p-5 text-xs text-muted-foreground">
            O tempo é calculado por horário real. Se você fechar ou atualizar o navegador, a sessão é pausada automaticamente e pode ser retomada depois — o tempo com o navegador fechado não é contado.
            {activeAct === undefined && timer && " A atividade desta sessão não existe mais."}
          </div>
        </div>
      </div>
    </div>
  );
}
