import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Upload, Trash2, Bell, Palette, Timer, Database, Globe } from "lucide-react";
import { clearAllData, replaceData, updateSettings, useAppState } from "@/lib/store";
import { downloadBackup, validateBackup } from "@/lib/backup";
import { PageHeader } from "@/components/app/AppShell";
import { ConfirmDialog } from "@/components/app/ConfirmDialog";
import { playChime } from "@/components/app/Controllers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AppState, PomodoroPrefs } from "@/lib/types";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Planejador de Estudos" },
      { name: "description", content: "Tema, notificações, Pomodoro, backup e dados locais." },
      { property: "og:title", content: "Configurações — Planejador de Estudos" },
      { property: "og:description", content: "Tema, notificações, Pomodoro, backup e dados locais." },
    ],
  }),
  component: Config,
});

function Section({ icon: Icon, title, children }: { icon: typeof Bell; title: string; children: React.ReactNode }) {
  return (
    <section className="card-surface p-5">
      <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground"><Icon className="h-5 w-5 text-primary" />{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div><p className="text-sm font-medium text-foreground">{label}</p>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>
      {children}
    </div>
  );
}

function Config() {
  const { settings, subjects, activities, sessions } = useAppState();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<AppState | null>(null);
  const [clear, setClear] = useState(false);
  const p = settings.pomodoroPreferences;

  const setPomo = (k: keyof PomodoroPrefs, v: string) => {
    const n = Math.round(Number(v));
    if (!Number.isFinite(n) || n < 1 || n > 180) return;
    updateSettings({ pomodoroPreferences: { ...p, [k]: n } });
  };

  const toggleNotif = async (on: boolean) => {
    if (!on) return updateSettings({ notificationsEnabled: false });
    if (typeof Notification === "undefined") return toast.error("Seu navegador não suporta notificações.");
    const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (perm !== "granted") return toast.error("Permissão de notificações negada pelo navegador.");
    updateSettings({ notificationsEnabled: true });
    toast.success("Notificações ativadas");
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const r = validateBackup(JSON.parse(await file.text()));
      if (!r.ok) return toast.error("Arquivo inválido", { description: r.errors.join(" ") });
      setPending(r.state);
    } catch {
      toast.error("Não foi possível ler o arquivo. Verifique se é um JSON válido.");
    }
  };

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Seus dados ficam salvos apenas neste navegador." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Section icon={Palette} title="Aparência">
          <Row label="Tema escuro" hint="Alterna entre tema claro e escuro.">
            <Switch checked={settings.theme === "dark"} onCheckedChange={(c) => updateSettings({ theme: c ? "dark" : "light" })} />
          </Row>
        </Section>

        <Section icon={Globe} title="Idioma e calendário">
          <Row label="Idioma" hint="Formato de data DD/MM/AAAA e horário 24h.">
            <Select value="pt-BR" disabled><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pt-BR">Português (Brasil)</SelectItem></SelectContent></Select>
          </Row>
          <Row label="Primeiro dia da semana">
            <Select value={String(settings.weekStartsOn)} onValueChange={(v) => updateSettings({ weekStartsOn: Number(v) as 0 | 1 })}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="1">Segunda-feira</SelectItem><SelectItem value="0">Domingo</SelectItem></SelectContent>
            </Select>
          </Row>
        </Section>

        <Section icon={Bell} title="Notificações">
          <Row label="Notificações do navegador" hint="Funcionam apenas com o aplicativo aberto.">
            <Switch checked={settings.notificationsEnabled} onCheckedChange={toggleNotif} />
          </Row>
          <Row label="Um dia antes do prazo">
            <Switch disabled={!settings.notificationsEnabled} checked={settings.notificationPreferences.dayBefore} onCheckedChange={(c) => updateSettings({ notificationPreferences: { ...settings.notificationPreferences, dayBefore: c } })} />
          </Row>
          <Row label="Quando a atividade ficar atrasada">
            <Switch disabled={!settings.notificationsEnabled} checked={settings.notificationPreferences.overdue} onCheckedChange={(c) => updateSettings({ notificationPreferences: { ...settings.notificationPreferences, overdue: c } })} />
          </Row>
        </Section>

        <Section icon={Timer} title="Cronômetro e Pomodoro">
          <Row label="Modo padrão">
            <Select value={settings.timerPreferences.defaultMode} onValueChange={(v) => updateSettings({ timerPreferences: { defaultMode: v as "simple" | "pomodoro" } })}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="simple">Cronômetro simples</SelectItem><SelectItem value="pomodoro">Pomodoro</SelectItem></SelectContent>
            </Select>
          </Row>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([["focus", "Concentração (min)"], ["shortBreak", "Pausa curta (min)"], ["longBreak", "Pausa longa (min)"], ["cyclesBeforeLong", "Ciclos até pausa longa"]] as [keyof PomodoroPrefs, string][]).map(([k, l]) => (
              <div key={k} className="space-y-1.5">
                <Label className="text-xs">{l}</Label>
                <Input type="number" min={1} max={180} defaultValue={p[k]} key={`${k}-${p[k]}`} onBlur={(e) => setPomo(k, e.target.value)} />
              </div>
            ))}
          </div>
          <Row label="Som dos avisos" hint="O aviso visual aparece mesmo com o som desligado.">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={playChime}>Testar</Button>
              <Switch checked={settings.soundEnabled} onCheckedChange={(c) => updateSettings({ soundEnabled: c })} />
            </div>
          </Row>
        </Section>

        <Section icon={Database} title="Backup e restauração">
          <p className="text-sm text-muted-foreground">{subjects.length} matérias · {activities.length} atividades · {sessions.length} sessões armazenadas.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="hero" onClick={() => { downloadBackup(); toast.success("Backup exportado"); }}><Download className="mr-1 h-4 w-4" />Exportar backup</Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="mr-1 h-4 w-4" />Importar backup</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
          </div>
          <p className="text-xs text-muted-foreground">Recomendamos exportar um backup antes de restaurar outro arquivo.</p>
        </Section>

        <Section icon={Trash2} title="Limpar dados">
          <p className="text-sm text-muted-foreground">Apaga matérias, atividades, sessões, configurações e todos os demais dados armazenados neste navegador.</p>
          <Button variant="destructive" onClick={() => setClear(true)}><Trash2 className="mr-1 h-4 w-4" />Limpar todos os dados</Button>
        </Section>
      </div>

      <ConfirmDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)} title="Substituir dados atuais?" confirmLabel="Restaurar"
        description={`O backup contém ${pending?.subjects.length ?? 0} matérias, ${pending?.activities.length ?? 0} atividades e ${pending?.sessions.length ?? 0} sessões. Todos os dados atuais serão substituídos.`}
        onConfirm={() => { if (pending) { replaceData(pending); toast.success("Backup restaurado com sucesso"); } }} />
      <ConfirmDialog open={clear} onOpenChange={setClear} title="Apagar todos os dados?" confirmLabel="Apagar tudo"
        description="Esta ação apagará permanentemente matérias, atividades, sessões, configurações e demais dados armazenados localmente. Não é possível desfazer."
        onConfirm={() => { clearAllData(); toast.success("Todos os dados foram apagados"); }} />
    </div>
  );
}
