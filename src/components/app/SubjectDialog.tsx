import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveSubject } from "@/lib/store";
import type { Subject } from "@/lib/types";
import { SUBJECT_COLORS, SUBJECT_ICONS } from "./subject-icons";

export function SubjectDialog({ open, onOpenChange, subject }: { open: boolean; onOpenChange: (o: boolean) => void; subject?: Subject | null }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(SUBJECT_COLORS[0]);
  const [icon, setIcon] = useState("book");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(subject?.name ?? "");
    setDescription(subject?.description ?? "");
    setColor(subject?.color ?? SUBJECT_COLORS[0]);
    setIcon(subject?.icon ?? "book");
    setError("");
  }, [open, subject]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Informe o nome da matéria.");
    saveSubject({ id: subject?.id, name: name.trim(), description: description.trim(), color, icon });
    toast.success(subject ? "Matéria atualizada" : "Matéria criada");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{subject ? "Editar matéria" : "Nova matéria"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sname">Nome *</Label>
            <Input id="sname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Matemática" autoFocus />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sdesc">Descrição</Label>
            <Textarea id="sdesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  aria-label={`Cor ${c}`}
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full ring-offset-2 ring-offset-background transition ${color === c ? "ring-2 ring-ring" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Ícone</Label>
            <div className="grid grid-cols-8 gap-2">
              {Object.entries(SUBJECT_ICONS).map(([k, Icon]) => (
                <button
                  type="button"
                  key={k}
                  aria-label={`Ícone ${k}`}
                  onClick={() => setIcon(k)}
                  className={`flex h-9 items-center justify-center rounded-lg border transition ${icon === k ? "border-primary bg-accent text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" variant="hero">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
