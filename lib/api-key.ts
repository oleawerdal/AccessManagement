import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { AdminRole } from "@prisma/client";

import { prisma } from "./prisma";

// Token shape: `am_<prefix>_<secret>`
//   - prefix: short, non-secret identifier (stored in clear, shown in the UI)
//   - secret: 256 bits of entropy, never stored
const TOKEN_NAMESPACE = "am";

/** SHA-256 hex digest. Tokens are high-entropy random values, so a fast hash
 * (not bcrypt) is appropriate and lets us look the key up by exact hash. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type GeneratedApiKey = {
  /** Full plaintext token — return to the caller ONCE, never persist. */
  token: string;
  prefix: string;
  keyHash: string;
};

export function generateApiKey(): GeneratedApiKey {
  const id = randomBytes(5).toString("hex"); // 10 hex chars
  const secret = randomBytes(32).toString("base64url");
  const prefix = `${TOKEN_NAMESPACE}_${id}`;
  const token = `${prefix}_${secret}`;
  return { token, prefix, keyHash: hashToken(token) };
}

export type ApiPrincipal = {
  keyId: string;
  name: string;
  role: AdminRole;
};

/**
 * Resolve a bearer token to a principal, or null when the token is unknown,
 * deactivated, or expired. Refreshes `lastUsedAt` on success (best-effort).
 */
export async function verifyApiKey(token: string): Promise<ApiPrincipal | null> {
  if (!token || !token.startsWith(`${TOKEN_NAMESPACE}_`)) return null;

  const keyHash = hashToken(token);
  const key = await prisma.apiKey.findUnique({ where: { keyHash } });
  if (!key) return null;

  // Constant-time compare as defence in depth (the DB lookup already matched
  // on the unique hash, but this guards against any future lookup change).
  const matches = timingSafeEqual(
    Buffer.from(key.keyHash),
    Buffer.from(keyHash),
  );
  if (!matches || !key.active) return null;
  if (key.expiresAt && key.expiresAt.getTime() <= Date.now()) return null;

  // Best-effort; a failed timestamp update must not reject a valid request.
  void prisma.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return { keyId: key.id, name: key.name, role: key.role };
}
