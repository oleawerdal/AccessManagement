import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { getClientIp, jsonError } from "./api";
import { runWithAuditContext } from "./audit-context";
import { canMutate, ForbiddenError, UnauthorizedError } from "./permissions";
import { verifyApiKey, type ApiPrincipal } from "./api-key";

function bearerToken(h: Headers): string | undefined {
  const header = h.get("authorization");
  if (!header) return undefined;
  const [scheme, ...rest] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer") return undefined;
  const value = rest.join(" ").trim();
  return value || undefined;
}

/**
 * Wraps an external REST (/api/v1) handler: authenticates via an API key
 * (`Authorization: Bearer <token>`), establishes the audit context attributed
 * to that key, and maps thrown errors to JSON responses — mirroring `withApi`
 * but for machine-to-machine clients instead of browser sessions.
 */
export async function withApiV1(
  fn: (principal: ApiPrincipal) => Promise<NextResponse> | NextResponse,
): Promise<NextResponse> {
  try {
    const h = headers();
    const token = bearerToken(h);
    if (!token) {
      throw new UnauthorizedError(
        "Mangler API-nøkkel. Send «Authorization: Bearer <nøkkel>».",
      );
    }

    const principal = await verifyApiKey(token);
    if (!principal) {
      throw new UnauthorizedError("Ugyldig, utløpt eller deaktivert API-nøkkel.");
    }

    return await runWithAuditContext(
      {
        adminEmail: `api:${principal.name}`,
        ipAddress: getClientIp(h),
        userAgent: h.get("user-agent") ?? undefined,
      },
      async () => fn(principal),
    );
  } catch (err) {
    return jsonError(err);
  }
}

/** Throws ForbiddenError unless the key's role may mutate (ADMIN). */
export function assertKeyCanMutate(principal: ApiPrincipal): void {
  if (!canMutate(principal.role)) {
    throw new ForbiddenError("API-nøkkelen har kun lesetilgang (AUDITOR).");
  }
}
