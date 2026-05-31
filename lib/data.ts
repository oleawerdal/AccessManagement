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

// Aggregated cell for a person's access to a physical resource. A person can
// have several accesses to the same resource (different methods), so the cell
// lists all methods and shows the most urgent expiry status among them.
export type ResourceMatrixCell = {
  status: ExpiryStatus;
  methods: string[];
  expiresAt: string | null;
  grantedAt: string;
  grantedBy: string | null;
  notes: string | null;
};

export async function getMatrixData() {
  const now = new Date();
  const [systems, persons, assignments, resources, resourceAccesses] =
    await Promise.all([
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
      prisma.resource.findMany({
        where: { active: true },
        orderBy: [{ type: { label: "asc" } }, { name: "asc" }],
        include: { type: true, riskLevel: true },
      }),
      prisma.resourceAccess.findMany({
        where: { revokedAt: null, person: { active: true } },
        select: {
          personId: true,
          resourceId: true,
          expiresAt: true,
          grantedAt: true,
          grantedBy: true,
          notes: true,
          method: { select: { label: true } },
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

  // Group active resources by their type for a separate matrix section.
  type ResourceCol = {
    id: string;
    name: string;
    riskLevel: (typeof resources)[number]["riskLevel"];
  };
  const resourceGroups: { id: string; label: string; resources: ResourceCol[] }[] =
    [];
  const groupByType = new Map<string, (typeof resourceGroups)[number]>();
  for (const r of resources) {
    let group = groupByType.get(r.typeId);
    if (!group) {
      group = { id: r.typeId, label: r.type.label, resources: [] };
      groupByType.set(r.typeId, group);
      resourceGroups.push(group);
    }
    group.resources.push({ id: r.id, name: r.name, riskLevel: r.riskLevel });
  }

  // resourceCells[personId][resourceId] — aggregate methods, worst status wins.
  const statusRank: Record<ExpiryStatus, number> = {
    VALID: 0,
    EXPIRING: 1,
    EXPIRED: 2,
  };
  const resourceCells: Record<string, Record<string, ResourceMatrixCell>> = {};
  for (const a of resourceAccesses) {
    const row = (resourceCells[a.personId] ??= {});
    const status = getExpiryStatus(a.expiresAt, now);
    const existing = row[a.resourceId];
    if (!existing) {
      row[a.resourceId] = {
        status,
        methods: [a.method.label],
        expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
        grantedAt: a.grantedAt.toISOString(),
        grantedBy: a.grantedBy,
        notes: a.notes,
      };
    } else {
      existing.methods.push(a.method.label);
      if (statusRank[status] > statusRank[existing.status]) {
        existing.status = status;
        existing.expiresAt = a.expiresAt ? a.expiresAt.toISOString() : null;
      }
    }
  }

  return { systems, persons, cells, resourceGroups, resourceCells };
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
      resourceAccesses: {
        include: {
          resource: { include: { type: true, riskLevel: true } },
          method: true,
        },
        orderBy: [{ resource: { name: "asc" } }, { grantedAt: "desc" }],
      },
      credentials: {
        include: {
          method: { select: { label: true } },
          _count: { select: { resourceAccesses: { where: { revokedAt: null } } } },
        },
        orderBy: [{ active: "desc" }, { identifier: "asc" }],
      },
    },
  });
}

export async function getResourceWithAccess(id: string) {
  return prisma.resource.findUnique({
    where: { id },
    include: {
      type: true,
      riskLevel: true,
      ownerPerson: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      accesses: {
        include: { person: true, method: true },
        orderBy: { grantedAt: "desc" },
      },
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
