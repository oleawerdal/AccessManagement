import type { RiskLevel } from "@prisma/client";

import { cn } from "@/lib/utils";
import { riskLevelClasses, riskLevelLabel } from "@/lib/labels";

export function RiskBadge({
  level,
  className,
}: {
  level: RiskLevel;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium",
        riskLevelClasses[level],
        className,
      )}
    >
      {riskLevelLabel[level]}
    </span>
  );
}
