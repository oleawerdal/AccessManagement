import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logGrant, logRevoke, logAssignmentUpdate } from "@/lib/audit";

const assignmentInclude = {
  person: { select: { firstName: true, lastName: true, email: true } },
  role: { select: { name: true, system: { select: { name: true } } } },
} satisfies Prisma.RoleAssignmentInclude;

type AssignmentWithRefs = Prisma.RoleAssignmentGetPayload<{
  include: typeof assignmentInclude;
}>;

export function assignmentLabel(a: AssignmentWithRefs): string {
  const person = `${a.person.firstName} ${a.person.lastName}`;
  return `${person} — ${a.role.system.name} / ${a.role.name}`;
}

function toJson(a: AssignmentWithRefs): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(a)) as Prisma.InputJsonValue;
}

/**
 * Grant a role directly to a person. If a DIRECT assignment already exists and
 * is active, this is a conflict. If it exists but was revoked/expired, it is
 * reactivated. Logs a GRANT audit entry.
 */
export async function grantDirect(input: {
  personId: string;
  roleId: string;
  expiresAt?: Date | null;
  notes?: string;
  grantedBy?: string;
}) {
  const existing = await prisma.roleAssignment.findUnique({
    where: {
      personId_roleId_source: {
        personId: input.personId,
        roleId: input.roleId,
        source: "DIRECT",
      },
    },
  });

  if (existing && !existing.revokedAt) {
    throw new Prisma.PrismaClientKnownRequestError(
      "Personen har allerede denne rollen direkte.",
      { code: "P2002", clientVersion: Prisma.prismaVersion.client },
    );
  }

  const assignment = existing
    ? await prisma.roleAssignment.update({
        where: { id: existing.id },
        data: {
          expiresAt: input.expiresAt ?? null,
          notes: input.notes,
          grantedBy: input.grantedBy,
          grantedAt: new Date(),
          revokedAt: null,
          revokedBy: null,
          revokeReason: null,
        },
        include: assignmentInclude,
      })
    : await prisma.roleAssignment.create({
        data: {
          personId: input.personId,
          roleId: input.roleId,
          source: "DIRECT",
          expiresAt: input.expiresAt ?? null,
          notes: input.notes,
          grantedBy: input.grantedBy,
        },
        include: assignmentInclude,
      });

  await logGrant({
    assignmentId: assignment.id,
    label: assignmentLabel(assignment),
    after: toJson(assignment),
    metadata: { source: "DIRECT", reactivated: Boolean(existing) },
  });

  return assignment;
}

export async function revokeAssignment(input: {
  assignmentId: string;
  reason: string;
  revokedBy?: string;
}) {
  const before = await prisma.roleAssignment.findUniqueOrThrow({
    where: { id: input.assignmentId },
    include: assignmentInclude,
  });

  const after = await prisma.roleAssignment.update({
    where: { id: input.assignmentId },
    data: {
      revokedAt: new Date(),
      revokedBy: input.revokedBy,
      revokeReason: input.reason,
    },
    include: assignmentInclude,
  });

  await logRevoke({
    assignmentId: after.id,
    label: assignmentLabel(after),
    before: toJson(before),
    after: toJson(after),
    metadata: { reason: input.reason },
  });

  return after;
}

/** Renew (or set) the expiry, reactivating a revoked assignment if needed. */
export async function renewAssignment(input: {
  assignmentId: string;
  expiresAt: Date | null;
  notes?: string;
}) {
  const before = await prisma.roleAssignment.findUniqueOrThrow({
    where: { id: input.assignmentId },
    include: assignmentInclude,
  });

  const after = await prisma.roleAssignment.update({
    where: { id: input.assignmentId },
    data: {
      expiresAt: input.expiresAt,
      notes: input.notes ?? before.notes,
      revokedAt: null,
      revokedBy: null,
      revokeReason: null,
    },
    include: assignmentInclude,
  });

  await logAssignmentUpdate({
    assignmentId: after.id,
    label: assignmentLabel(after),
    before: toJson(before),
    after: toJson(after),
    metadata: { action: "renew" },
  });

  return after;
}

/** Mark an expired access as "still required" — logged, no field change. */
export async function markStillNeeded(input: {
  assignmentId: string;
  note?: string;
}) {
  const current = await prisma.roleAssignment.findUniqueOrThrow({
    where: { id: input.assignmentId },
    include: assignmentInclude,
  });

  await logAssignmentUpdate({
    assignmentId: current.id,
    label: assignmentLabel(current),
    before: toJson(current),
    after: toJson(current),
    metadata: { review: "still_needed", note: input.note ?? null },
  });

  return current;
}

export { assignmentInclude };
