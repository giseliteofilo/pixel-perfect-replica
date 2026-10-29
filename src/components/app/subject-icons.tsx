import {
  BookOpen, Calculator, FlaskConical, Globe, Languages, Landmark, Music, Palette, Code, Atom,
  Brain, Dna, PenTool, Scale, Microscope, GraduationCap, type LucideIcon,
} from "lucide-react";

export const SUBJECT_ICONS: Record<string, LucideIcon> = {
  book: BookOpen, calculator: Calculator, flask: FlaskConical, globe: Globe, languages: Languages,
  landmark: Landmark, music: Music, palette: Palette, code: Code, atom: Atom, brain: Brain,
  dna: Dna, pen: PenTool, scale: Scale, microscope: Microscope, graduation: GraduationCap,
};

export const SUBJECT_COLORS = [
  "#2563eb", "#0ea5e9", "#14b8a6", "#22c55e", "#eab308", "#f97316", "#ef4444", "#ec4899", "#8b5cf6", "#64748b",
];

export function SubjectIcon({ icon, color, size = "md" }: { icon: string; color: string; size?: "sm" | "md" | "lg" }) {
  const Icon = SUBJECT_ICONS[icon] ?? BookOpen;
  const box = size === "sm" ? "h-7 w-7 rounded-lg" : size === "lg" ? "h-14 w-14 rounded-2xl" : "h-10 w-10 rounded-xl";
  const ic = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-7 w-7" : "h-5 w-5";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${box}`}
      style={{ backgroundColor: `${color}1f`, color }}
    >
      <Icon className={ic} />
    </span>
  );
}
