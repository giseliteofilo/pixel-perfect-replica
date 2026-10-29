import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, BookOpen, ListChecks, Timer, History, BarChart3, Settings, Menu, Moon, Sun,
} from "lucide-react";
import { Logo } from "./Logo";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { updateSettings, useAppState, elapsedSeconds } from "@/lib/store";
import { fmtClock } from "@/lib/format";
import { useNow } from "./hooks";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/materias", label: "Minhas Matérias", icon: BookOpen },
  { to: "/atividades", label: "Todas as Atividades", icon: ListChecks },
  { to: "/cronometro", label: "Cronômetro", icon: Timer },
  { to: "/historico", label: "Histórico de Estudos", icon: History },
  { to: "/relatorios", label: "Relatórios e Estatísticas", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => {
        const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
        return (
          <Link
            key={n.to}
            to={n.to}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <n.icon className="h-[18px] w-[18px]" />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

function TimerPill() {
  const { timer } = useAppState();
  const now = useNow(1000, !!timer?.running);
  if (!timer) return null;
  return (
    <Link to="/cronometro" className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground">
      <span className={`h-2 w-2 rounded-full ${timer.running ? "animate-pulse bg-success" : "bg-warning"}`} />
      {timer.running ? "Estudando" : timer.awaitingNext ? "Etapa concluída" : "Pausado"}
      <span className="ml-auto font-mono">{fmtClock(elapsedSeconds(timer, now))}</span>
    </Link>
  );
}

function ThemeButton() {
  const { settings } = useAppState();
  const dark = settings.theme === "dark";
  return (
    <Button variant="ghost" size="icon" aria-label="Alternar tema" onClick={() => updateSettings({ theme: dark ? "light" : "dark" })}>
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <div className="flex items-center justify-between px-1 pb-6 pt-1">
          <Logo />
          <ThemeButton />
        </div>
        <NavList />
        <div className="mt-auto"><TimerPill /></div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
        <Button variant="ghost" size="icon" aria-label="Abrir menu" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <Logo />
        <ThemeButton />
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-4">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="pb-6 pt-1"><Logo /></div>
          <NavList onNavigate={() => setOpen(false)} />
          <TimerPill />
        </SheetContent>
      </Sheet>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-in-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: typeof BookOpen; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card-surface flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
