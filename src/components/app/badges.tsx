import type { Priority, Status } from "@/lib/types";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/format";

const PRI: Record<Priority, string> = {
  low: "bg-success/15 text-success",
  medium: "bg-warning/20 text-foreground",
  high: "bg-destructive/15 text-destructive",
};
const STA: Record<Status, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-accent text-accent-foreground",
  done: "bg-success/15 text-success",
};

const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold";

export function PriorityBadge({ p }: { p: Priority | null }) {
  if (!p) return null;
  return <span className={`${base} ${PRI[p]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{PRIORITY_LABEL[p]}</span>;
}
export function StatusBadge({ s }: { s: Status }) {
  return <span className={`${base} ${STA[s]}`}>{STATUS_LABEL[s]}</span>;
}
export function OverdueBadge() {
  return <span className={`${base} bg-destructive text-destructive-foreground`}>Atrasada</span>;
}

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${color ? "" : "bg-gradient-primary"}`}
        style={{ width: `${value}%`, ...(color ? { backgroundColor: color } : {}) }}
      />
    </div>
  );
}
