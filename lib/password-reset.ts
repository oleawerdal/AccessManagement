import { createHash, randomBytes } from "node:crypto";
import { addHours } from "date-fns";

import { prisma } from "./prisma";

const DEFAULT_TTL_HOURS = 24;

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Create a single-use reset token for an admin user; returns the plaintext. */
export async function createResetToken(
  adminUserId: string,
  ttlHours = DEFAULT_TTL_HOURS,
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await prisma.passwordResetToken.create({
    data: {
      adminUserId,
      tokenHash: hashResetToken(token),
      expiresAt: addHours(new Date(), ttlHours),
    },
  });
  return token;
}

/**
 * Validate and consume a reset token. Returns the admin user id on success, or
 * null if the token is unknown, already used, or expired.
 */
export async function consumeResetToken(token: string): Promise<string | null> {
  const rec = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
  });
  if (!rec || rec.usedAt || rec.expiresAt.getTime() < Date.now()) return null;
  await prisma.passwordResetToken.update({
    where: { id: rec.id },
    data: { usedAt: new Date() },
  });
  return rec.adminUserId;
}

/** Absolute base URL for links in e-mails. */
export function appBaseUrl(): string {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
