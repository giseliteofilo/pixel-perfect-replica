export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-xl bg-gradient-primary shadow-glow ${className}`}>
      <svg viewBox="0 0 24 24" className="h-[60%] w-[60%] text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M2 5.5c3-1.3 6.3-1.3 10 .8v13c-3.7-2.1-7-2.1-10-.8z" />
        <path d="M22 5.5c-3-1.3-6.3-1.3-10 .8v13c3.7-2.1 7-2.1 10-.8z" />
        <path d="m15 10.5 1.6 1.6 3-3.2" />
      </svg>
    </span>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <div className="leading-tight">
        <div className="font-display text-[15px] font-bold text-foreground">Planejador</div>
        <div className="text-xs font-medium text-muted-foreground">de Estudos</div>
      </div>
    </div>
  );
}
