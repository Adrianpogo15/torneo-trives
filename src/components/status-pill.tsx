type StatusPillProps = {
  status: "ok" | "warning" | "muted";
  children: React.ReactNode;
};

const styles = {
  ok: "border-gold-400 bg-gold-50 text-ink",
  warning: "border-amber-300 bg-amber-50 text-amber-800",
  muted: "border-line bg-white text-ink/65",
};

export function StatusPill({ status, children }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {children}
    </span>
  );
}
