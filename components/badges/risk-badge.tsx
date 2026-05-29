import { cn } from "@/lib/utils";

export type RiskLevelLike = {
  label: string;
  color: string;
  description?: string | null;
};

// Risk levels are now user-configurable with an arbitrary hex colour, so the
// badge styles inline from that colour (8-digit hex adds alpha for the tint).
export function RiskBadge({
  level,
  className,
}: {
  level: RiskLevelLike | null | undefined;
  className?: string;
}) {
  if (!level) return null;
  const color = /^#[0-9a-fA-F]{6}$/.test(level.color) ? level.color : "#64748b";
  return (
    <span
      title={level.description ?? undefined}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium",
        className,
      )}
      style={{
        color,
        borderColor: `${color}40`,
        backgroundColor: `${color}1a`,
      }}
    >
      {level.label}
    </span>
  );
}
