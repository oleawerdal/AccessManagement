import type { SsoSettings } from "@prisma/client";

import { prisma } from "./prisma";

// Small in-process cache so the NextAuth config (built per request via lazy
// initialization) doesn't hit the database on every auth() call. SSO config
// changes rarely; a short TTL keeps the overhead negligible while still
// reflecting changes within ~30s across instances.
const TTL_MS = 30_000;
let cache: { value: SsoSettings | null; at: number } | null = null;

export async function getSsoSettings(): Promise<SsoSettings | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const value = await prisma.ssoSettings
    .findUnique({ where: { id: "default" } })
    .catch(() => null);
  cache = { value, at: Date.now() };
  return value;
}

/** Clear the cache so a change takes effect immediately on this instance. */
export function invalidateSsoCache(): void {
  cache = null;
}

export type EntraConfig = {
  clientId: string;
  clientSecret: string;
  issuer: string;
};

/**
 * Resolve the effective Entra config: the database settings take precedence,
 * falling back to the AUTH_ENTRA_* environment variables for backwards
 * compatibility. Returns null when SSO is not enabled/configured.
 */
export async function getEntraConfig(): Promise<EntraConfig | null> {
  const s = await getSsoSettings();
  if (s?.enabled && s.clientId && s.clientSecret && s.issuer) {
    return { clientId: s.clientId, clientSecret: s.clientSecret, issuer: s.issuer };
  }
  if (
    process.env.AUTH_ENTRA_ENABLED === "true" &&
    process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
    process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET &&
    process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER
  ) {
    return {
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    };
  }
  return null;
}

/** True when SSO should be offered (used to show the login button). */
export async function isEntraEnabled(): Promise<boolean> {
  return (await getEntraConfig()) !== null;
}
