import type { AdminRole } from "@prisma/client";
import type { Session } from "next-auth";

export function isAdmin(role: AdminRole | undefined | null): boolean {
  return role === "ADMIN";
}

export function isAuditor(role: AdminRole | undefined | null): boolean {
  return role === "AUDITOR";
}

/** Both roles may read; only ADMIN may mutate. */
export function canMutate(role: AdminRole | undefined | null): boolean {
  return isAdmin(role);
}

export function canExport(role: AdminRole | undefined | null): boolean {
  return role === "ADMIN" || role === "AUDITOR";
}

export class ForbiddenError extends Error {
  constructor(message = "Krever ADMIN-rolle.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Ikke innlogget.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Throws UnauthorizedError if no session, ForbiddenError if not ADMIN. */
export function assertCanMutate(session: Session | null): void {
  if (!session?.user) throw new UnauthorizedError();
  if (!canMutate(session.user.role)) throw new ForbiddenError();
}

export function assertAuthenticated(session: Session | null): void {
  if (!session?.user) throw new UnauthorizedError();
}
