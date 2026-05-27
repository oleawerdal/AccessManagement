import { differenceInCalendarDays } from "date-fns";

export const EXPIRING_THRESHOLD_DAYS = 30;

export type ExpiryStatus = "VALID" | "EXPIRING" | "EXPIRED";

export type AssignmentLike = {
  expiresAt: Date | string | null;
  revokedAt?: Date | string | null;
};

function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  return value instanceof Date ? value : new Date(value);
}

/**
 * Expiry status, ignoring revocation:
 *  - VALID:    no expiry, or more than 30 days remaining (green)
 *  - EXPIRING: expires within 30 days (amber)
 *  - EXPIRED:  expiry is in the past (red — requires revision)
 */
export function getExpiryStatus(
  expiresAt: Date | string | null,
  now: Date = new Date(),
): ExpiryStatus {
  const date = toDate(expiresAt);
  if (!date) return "VALID";
  const days = differenceInCalendarDays(date, now);
  if (days < 0) return "EXPIRED";
  if (days <= EXPIRING_THRESHOLD_DAYS) return "EXPIRING";
  return "VALID";
}

/** Whole days until expiry; negative if already expired, null if permanent. */
export function daysUntilExpiry(
  expiresAt: Date | string | null,
  now: Date = new Date(),
): number | null {
  const date = toDate(expiresAt);
  if (!date) return null;
  return differenceInCalendarDays(date, now);
}

/** Active = not revoked AND (no expiry OR expiry in the future). */
export function isAssignmentActive(
  assignment: AssignmentLike,
  now: Date = new Date(),
): boolean {
  if (toDate(assignment.revokedAt)) return false;
  const expires = toDate(assignment.expiresAt);
  return !expires || expires.getTime() > now.getTime();
}

/** Needs revision = expired (in the past) and not yet revoked. */
export function needsRevision(
  assignment: AssignmentLike,
  now: Date = new Date(),
): boolean {
  if (toDate(assignment.revokedAt)) return false;
  const expires = toDate(assignment.expiresAt);
  return !!expires && expires.getTime() <= now.getTime();
}

export const expiryStatusLabel: Record<ExpiryStatus, string> = {
  VALID: "Gyldig",
  EXPIRING: "Utløper snart",
  EXPIRED: "Utløpt",
};

/** Tailwind helper classes per status, for dots/badges across the UI. */
export const expiryStatusClasses: Record<
  ExpiryStatus,
  { dot: string; text: string; badge: string }
> = {
  VALID: {
    dot: "bg-status-valid",
    text: "text-status-valid",
    badge: "bg-status-valid/10 text-status-valid border-status-valid/20",
  },
  EXPIRING: {
    dot: "bg-status-expiring",
    text: "text-status-expiring",
    badge: "bg-status-expiring/10 text-status-expiring border-status-expiring/20",
  },
  EXPIRED: {
    dot: "bg-status-expired",
    text: "text-status-expired",
    badge: "bg-status-expired/10 text-status-expired border-status-expired/20",
  },
};
