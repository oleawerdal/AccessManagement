import { addDays } from "date-fns";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  getExpiryStatus,
  EXPIRING_THRESHOLD_DAYS,
  type ExpiryStatus,
} from "@/lib/expiry";

export async function getDashboardData() {
  const now = new Date();
  const soon = addDays(now, EXPIRING_THRESHOLD_DAYS);

  const activeWhere: Prisma.RoleAssignmentWhereInput = {
    revokedAt: null,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };

  const [
    personCount,
    systemCount,
    activeAssignments,
    needsRevisionCount,
    expiringSoonCount,
    revisionList,
    recentAudit,
  ] = await Promise.all([
    prisma.person.count({ where: { active: true } }),
    prisma.system.count({ where: { active: true } }),
    prisma.roleAssignment.count({ where: activeWhere }),
    prisma.roleAssignment.count({
      where: { revokedAt: null, expiresAt: { lt: now } },
    }),
    prisma.roleAssignment.count({
      where: { revokedAt: null, expiresAt: { gte: now, lte: soon } },
    }),
    prisma.roleAssignment.findMany({
      where: { revokedAt: null, expiresAt: { lt: now } },
      include: {
        person: true,
        role: { include: { system: true, riskLevel: true } },
      },
      orderBy: { expiresAt: "asc" },
    }),
    prisma.auditLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 6,
    }),
  ]);

  return {
    personCount,
    systemCount,
    activeAssignments,
    needsRevisionCount,
    expiringSoonCount,
    revisionList,
    recentAudit,
  };
}

export type MatrixCell = {
  status: ExpiryStatus;
  expiresAt: string | null;
  source: "DIRECT" | "GROUP";
  grantedAt: string;
  grantedBy: string | null;
  notes: string | null;
  assignmentId: string;
};

export async function getMatrixData() {
  const now = new Date();
  const [systems, persons, assignments] = await Promise.all([
    prisma.system.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        roles: { orderBy: { name: "asc" }, include: { riskLevel: true } },
      },
    }),
    prisma.person.findMany({
      where: { active: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.roleAssignment.findMany({
      where: { revokedAt: null, person: { active: true } },
      select: {
        id: true,
        personId: true,
        roleId: true,
        source: true,
        expiresAt: true,
        grantedAt: true,
        grantedBy: true,
        notes: true,
      },
    }),
  ]);

  // cells[personId][roleId] — prefer DIRECT over GROUP when both exist.
  const cells: Record<string, Record<string, MatrixCell>> = {};
  for (const a of assignments) {
    const row = (cells[a.personId] ??= {});
    const existing = row[a.roleId];
    if (existing && existing.source === "DIRECT" && a.source === "GROUP") {
      continue;
    }
    row[a.roleId] = {
      assignmentId: a.id,
      status: getExpiryStatus(a.expiresAt, now),
      expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
      source: a.source,
      grantedAt: a.grantedAt.toISOString(),
      grantedBy: a.grantedBy,
      notes: a.notes,
    };
  }

  return { systems, persons, cells };
}

export async function getPersonWithAccess(id: string) {
  return prisma.person.findUnique({
    where: { id },
    include: {
      assignments: {
        include: { role: { include: { system: true, riskLevel: true } } },
        orderBy: [{ role: { system: { name: "asc" } } }, { grantedAt: "desc" }],
      },
      memberships: { include: { group: true }, orderBy: { addedAt: "desc" } },
    },
  });
}

export async function getSystemWithAccess(id: string) {
  return prisma.system.findUnique({
    where: { id },
    include: {
      ownerPerson: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      roles: {
        orderBy: { name: "asc" },
        include: {
          riskLevel: true,
          assignments: {
            where: { revokedAt: null },
            include: { person: true },
            orderBy: { grantedAt: "desc" },
          },
        },
      },
    },
  });
}
