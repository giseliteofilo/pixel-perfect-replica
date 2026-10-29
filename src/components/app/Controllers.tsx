import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
import {
  HEARTBEAT_KEY, completePomodoroPhase, elapsedSeconds, getState, markNotified, pauseTimer, phaseTarget, useAppState,
} from "@/lib/store";
import { PHASE_LABEL } from "@/lib/format";
import { todayKey } from "@/lib/progress";

export function playChime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    [660, 880].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.type = "sine";
      const t = ctx.currentTime + i * 0.22;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.55);
    });
  } catch {
    /* audio unavailable */
  }
}

/** Applies theme, keeps timer heartbeat, ends pomodoro phases, pauses on unload, checks deadlines. */
export function AppControllers() {
  const s = useAppState();
  const theme = s.settings.theme;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const onUnload = () => pauseTimer();
    window.addEventListener("pagehide", onUnload);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const st = getState();
      const t = st.timer;
      if (!t) return;
      if (t.running) localStorage.setItem(HEARTBEAT_KEY, String(Date.now()));
      if (t.mode === "pomodoro" && !t.awaitingNext && elapsedSeconds(t) >= phaseTarget(st.settings, t.phase)) {
        const phase = t.phase;
        completePomodoroPhase();
        toast.success(`${PHASE_LABEL[phase]} concluída!`, { description: "Clique em “Iniciar próxima etapa” quando estiver pronto." });
        if (st.settings.soundEnabled) playChime();
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const lastCheck = useRef(0);
  useEffect(() => {
    const check = () => {
      const st = getState();
      if (!st.settings.notificationsEnabled || typeof Notification === "undefined" || Notification.permission !== "granted") return;
      const today = todayKey();
      const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
      for (const a of st.activities) {
        if (a.status === "done" || !a.dueDate) continue;
        if (st.settings.notificationPreferences.dayBefore && a.dueDate === tomorrow) {
          const key = `${a.id}:before:${a.dueDate}`;
          if (!st.notified[key]) {
            new Notification("Prazo amanhã", { body: `“${a.title}” vence amanhã.` });
            markNotified(key);
          }
        }
        if (st.settings.notificationPreferences.overdue && a.dueDate < today) {
          const key = `${a.id}:overdue:${a.dueDate}`;
          if (!st.notified[key]) {
            new Notification("Atividade atrasada", { body: `“${a.title}” passou do prazo.` });
            markNotified(key);
          }
        }
      }
    };
    if (Date.now() - lastCheck.current > 5000) {
      lastCheck.current = Date.now();
      check();
    }
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [s.activities, s.settings.notificationsEnabled]);

  return null;
}
