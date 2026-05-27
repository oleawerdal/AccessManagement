import { format } from "date-fns";
import { nb } from "date-fns/locale";

import { cn } from "@/lib/utils";
import {
  daysUntilExpiry,
  expiryStatusClasses,
  expiryStatusLabel,
  getExpiryStatus,
} from "@/lib/expiry";

function relativeLabel(expiresAt: Date | string | null): string {
  if (!expiresAt) return "Permanent";
  const days = daysUntilExpiry(expiresAt);
  if (days === null) return "Permanent";
  if (days < 0) return `Utløpt for ${Math.abs(days)} d. siden`;
  if (days === 0) return "Utløper i dag";
  return `${days} d. igjen`;
}

/** Coloured status dot + relative label, used in tables and detail views. */
export function ExpiryIndicator({
  expiresAt,
  revokedAt,
  className,
  showDate = false,
}: {
  expiresAt: Date | string | null;
  revokedAt?: Date | string | null;
  className?: string;
  showDate?: boolean;
}) {
  if (revokedAt) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
          className,
        )}
      >
        <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
        Revokert
      </span>
    );
  }

  const status = getExpiryStatus(expiresAt);
  const classes = expiryStatusClasses[status];

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs", classes.text, className)}
      title={
        expiresAt
          ? `${expiryStatusLabel[status]} — ${format(new Date(expiresAt), "PPP", { locale: nb })}`
          : "Permanent tilgang"
      }
    >
      <span className={cn("h-2 w-2 rounded-full", classes.dot)} />
      {showDate && expiresAt
        ? format(new Date(expiresAt), "dd.MM.yyyy", { locale: nb })
        : relativeLabel(expiresAt)}
    </span>
  );
}
