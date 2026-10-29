import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveActivity, useAppState } from "@/lib/store";
import type { Activity, Priority, Status } from "@/lib/types";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/format";

export function ActivityDialog({
  open, onOpenChange, activity, defaultSubjectId,
}: { open: boolean; onOpenChange: (o: boolean) => void; activity?: Activity | null; defaultSubjectId?: string }) {
  const { subjects } = useAppState();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [priority, setPriority] = useState<string>("none");
  const [status, setStatus] = useState<Status>("pending");
  const [dueDate, setDueDate] = useState("");
  const [h, setH] = useState("");
  const [m, setM] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setTitle(activity?.title ?? "");
    setDescription(activity?.description ?? "");
    setSubjectId(activity?.subjectId ?? defaultSubjectId ?? "");
    setPriority(activity?.priority ?? "none");
    setStatus(activity?.status ?? "pending");
    setDueDate(activity?.dueDate ?? "");
    const est = activity?.estimatedMinutes ?? null;
    setH(est != null ? String(Math.floor(est / 60)) : "");
    setM(est != null ? String(est % 60) : "");
    setErrors({});
  }, [open, activity, defaultSubjectId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Informe o título.";
    if (!subjectId || !subjects.some((s) => s.id === subjectId)) errs.subject = "Selecione a matéria.";
    const hh = h === "" ? 0 : Number(h);
    const mm = m === "" ? 0 : Number(m);
    if (!Number.isInteger(hh) || hh < 0 || !Number.isInteger(mm) || mm < 0 || mm > 59) errs.est = "Tempo inválido (minutos de 0 a 59).";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const est = h === "" && m === "" ? null : hh * 60 + mm;
    saveActivity({
      id: activity?.id,
      title: title.trim(),
      description: description.trim(),
      subjectId,
      priority: priority === "none" ? null : (priority as Priority),
      dueDate: dueDate || null,
      estimatedMinutes: est && est > 0 ? est : null,
      status,
    });
    toast.success(activity ? "Atividade atualizada" : "Atividade criada");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{activity ? "Editar atividade" : "Nova atividade"}</DialogTitle>
        </DialogHeader>
        {subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Cadastre uma matéria antes de criar atividades.</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="atitle">Título *</Label>
              <Input id="atitle" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Matéria *</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem prioridade</SelectItem>
                    {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="adue">Data prevista</Label>
                <Input id="adue" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tempo estimado</Label>
                <div className="flex items-center gap-1.5">
                  <Input aria-label="Horas" type="number" min={0} placeholder="h" value={h} onChange={(e) => setH(e.target.value)} />
                  <Input aria-label="Minutos" type="number" min={0} max={59} placeholder="min" value={m} onChange={(e) => setM(e.target.value)} />
                </div>
              </div>
            </div>
            {errors.est && <p className="text-xs text-destructive">{errors.est}</p>}
            <div className="space-y-1.5">
              <Label htmlFor="adesc">Observações</Label>
              <Textarea id="adesc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" variant="hero">Salvar</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
