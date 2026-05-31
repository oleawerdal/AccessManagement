import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logResourceAccess } from "@/lib/audit";

const accessInclude = {
  person: { select: { firstName: true, lastName: true, email: true } },
  resource: { select: { name: true, type: { select: { label: true } } } },
  method: { select: { label: true } },
} satisfies Prisma.ResourceAccessInclude;

type AccessWithRefs = Prisma.ResourceAccessGetPayload<{
  include: typeof accessInclude;
}>;

export function resourceAccessLabel(a: AccessWithRefs): string {
  const person = `${a.person.firstName} ${a.person.lastName}`;
  return `${person} — ${a.resource.name} (${a.method.label})`;
}

function toJson(a: AccessWithRefs): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(a)) as Prisma.InputJsonValue;
}

/**
 * Grant a person access to a resource via a method. If an access already exists
 * for the same (person, resource, method) and is active, this is a conflict. If
 * it exists but was revoked/expired, it is reactivated. Logs a GRANT entry.
 */
export async function grantResourceAccess(input: {
  personId: string;
  resourceId: string;
  methodId: string;
  credentialId?: string;
  expiresAt?: Date | null;
  notes?: string;
  grantedBy?: string;
}) {
  const existing = await prisma.resourceAccess.findUnique({
    where: {
      personId_resourceId_methodId: {
        personId: input.personId,
        resourceId: input.resourceId,
        methodId: input.methodId,
      },
    },
  });

  if (existing && !existing.revokedAt) {
    throw new Prisma.PrismaClientKnownRequestError(
      "Personen har allerede denne tilgangen med valgt metode.",
      { code: "P2002", clientVersion: Prisma.prismaVersion.client },
    );
  }

  const access = existing
    ? await prisma.resourceAccess.update({
        where: { id: existing.id },
        data: {
          credentialId: input.credentialId ?? null,
          expiresAt: input.expiresAt ?? null,
          notes: input.notes,
          grantedBy: input.grantedBy,
          grantedAt: new Date(),
          revokedAt: null,
          revokedBy: null,
          revokeReason: null,
          credentialReturned: false,
          credentialReturnedAt: null,
          expiryNotifiedAt: null,
        },
        include: accessInclude,
      })
    : await prisma.resourceAccess.create({
        data: {
          personId: input.personId,
          resourceId: input.resourceId,
          methodId: input.methodId,
          credentialId: input.credentialId ?? null,
          expiresAt: input.expiresAt ?? null,
          notes: input.notes,
          grantedBy: input.grantedBy,
        },
        include: accessInclude,
      });

  await logResourceAccess({
    action: "GRANT",
    accessId: access.id,
    label: resourceAccessLabel(access),
    after: toJson(access),
    metadata: { reactivated: Boolean(existing) },
  });

  return access;
}

export async function revokeResourceAccess(input: {
  accessId: string;
  reason: string;
  credentialReturned?: boolean;
  revokedBy?: string;
}) {
  const before = await prisma.resourceAccess.findUniqueOrThrow({
    where: { id: input.accessId },
    include: accessInclude,
  });

  const after = await prisma.resourceAccess.update({
    where: { id: input.accessId },
    data: {
      revokedAt: new Date(),
      revokedBy: input.revokedBy,
      revokeReason: input.reason,
      credentialReturned: input.credentialReturned ?? before.credentialReturned,
      credentialReturnedAt: input.credentialReturned
        ? new Date()
        : before.credentialReturnedAt,
    },
    include: accessInclude,
  });

  await logResourceAccess({
    action: "REVOKE",
    accessId: after.id,
    label: resourceAccessLabel(after),
    before: toJson(before),
    after: toJson(after),
    metadata: {
      reason: input.reason,
      credentialReturned: after.credentialReturned,
    },
  });

  return after;
}

/** Renew (or set) the expiry, reactivating a revoked access if needed. */
export async function renewResourceAccess(input: {
  accessId: string;
  expiresAt: Date | null;
  notes?: string;
}) {
  const before = await prisma.resourceAccess.findUniqueOrThrow({
    where: { id: input.accessId },
    include: accessInclude,
  });

  const after = await prisma.resourceAccess.update({
    where: { id: input.accessId },
    data: {
      expiresAt: input.expiresAt,
      notes: input.notes ?? before.notes,
      revokedAt: null,
      revokedBy: null,
      revokeReason: null,
      expiryNotifiedAt: null,
    },
    include: accessInclude,
  });

  await logResourceAccess({
    action: "UPDATE",
    accessId: after.id,
    label: resourceAccessLabel(after),
    before: toJson(before),
    after: toJson(after),
    metadata: { action: "renew" },
  });

  return after;
}

/** Mark a returned physical credential, without revoking — logged for audit. */
export async function markCredentialReturned(input: {
  accessId: string;
  returned: boolean;
}) {
  const before = await prisma.resourceAccess.findUniqueOrThrow({
    where: { id: input.accessId },
    include: accessInclude,
  });

  const after = await prisma.resourceAccess.update({
    where: { id: input.accessId },
    data: {
      credentialReturned: input.returned,
      credentialReturnedAt: input.returned ? new Date() : null,
    },
    include: accessInclude,
  });

  await logResourceAccess({
    action: "UPDATE",
    accessId: after.id,
    label: resourceAccessLabel(after),
    before: toJson(before),
    after: toJson(after),
    metadata: { credentialReturned: input.returned },
  });

  return after;
}

export { accessInclude };
