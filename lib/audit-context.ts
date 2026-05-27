import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Per-request context that identifies the acting admin. The audit Prisma
 * extension reads this to attribute mutations. When no context is present
 * (e.g. during login before a session exists, or background jobs) the
 * extension does NOT auto-log — explicit helpers are used instead.
 */
export type AuditContext = {
  adminUserId?: string;
  adminEmail: string;
  ipAddress?: string;
  userAgent?: string;
  /** When true, auto-auditing is suppressed for the wrapped work. */
  skip?: boolean;
};

const storage = new AsyncLocalStorage<AuditContext>();

export function runWithAuditContext<T>(
  context: AuditContext,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(context, fn);
}

export function getAuditContext(): AuditContext | undefined {
  return storage.getStore();
}
