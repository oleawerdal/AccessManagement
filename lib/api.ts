import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import type { Session } from "next-auth";

import { auth } from "./auth";
import { runWithAuditContext, type AuditContext } from "./audit-context";
import { ForbiddenError, UnauthorizedError } from "./permissions";

export function getClientIp(h: Headers): string | undefined {
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim();
  return h.get("x-real-ip") ?? undefined;
}

export function auditContextFromSession(session: Session): AuditContext {
  const h = headers();
  return {
    adminUserId: session.user.id,
    adminEmail: session.user.email ?? "ukjent",
    ipAddress: getClientIp(h),
    userAgent: h.get("user-agent") ?? undefined,
  };
}

export function jsonError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Valideringsfeil", issues: err.flatten() },
      { status: 400 },
    );
  }
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = (err.meta?.target as string[] | undefined)?.join(", ");
      return NextResponse.json(
        { error: `Verdien finnes allerede${target ? ` (${target})` : ""}.` },
        { status: 409 },
      );
    }
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Ikke funnet." }, { status: 404 });
    }
  }
  console.error("[api] unhandled error", err);
  return NextResponse.json({ error: "Intern feil." }, { status: 500 });
}

/**
 * Wraps an API handler: requires an authenticated session, establishes the
 * audit context for the request, and maps thrown errors to JSON responses.
 */
export async function withApi(
  fn: (session: Session) => Promise<NextResponse> | NextResponse,
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    const ctx = auditContextFromSession(session);
    return await runWithAuditContext(ctx, async () => fn(session));
  } catch (err) {
    return jsonError(err);
  }
}
