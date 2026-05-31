import type { AssignmentSource } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getExpiryStatus, needsRevision, type ExpiryStatus } from "@/lib/expiry";

export type ExportAccess = {
  systemName: string;
  roleName: string;
  riskLevel: string;
  source: AssignmentSource;
  status: ExpiryStatus;
  expiresAt: Date | null;
  grantedAt: Date;
};

export type ExportResourceAccess = {
  resourceId: string;
  resourceName: string;
  typeLabel: string;
  riskLevel: string | null;
  method: string;
  credentialId: string | null;
  status: ExpiryStatus;
  expiresAt: Date | null;
  grantedAt: Date;
};

export type ExportPerson = {
  id: string;
  name: string;
  email: string;
  department: string | null;
  accesses: ExportAccess[];
  resourceAccesses: ExportResourceAccess[];
};

export type ExportResource = {
  id: string;
  name: string;
  typeLabel: string;
  riskLevel: string | null;
  location: string | null;
  people: {
    name: string;
    method: string;
    credentialId: string | null;
    status: ExpiryStatus;
    expiresAt: Date | null;
  }[];
};

export type ExportRolePeople = {
  roleName: string;
  riskLevel: string;
  people: {
    name: string;
    source: AssignmentSource;
    status: ExpiryStatus;
    expiresAt: Date | null;
  }[];
};

export type ExportSystem = {
  name: string;
  roles: { id: string; name: string; riskLevel: string }[];
  rolePeople: ExportRolePeople[];
};

export type ExportData = {
  generatedAt: Date;
  summary: {
    persons: number;
    systems: number;
    activeAssignments: number;
    needsRevision: number;
    resources: number;
    resourceAccesses: number;
    resourceNeedsRevision: number;
  };
  persons: ExportPerson[];
  systems: ExportSystem[];
  resources: ExportResource[];
  // matrix[personId][roleId] = status
  matrix: Record<string, Record<string, ExportAccess>>;
  // resourceMatrix[personId][resourceId] = worst expiry status among methods
  resourceMatrix: Record<string, Record<string, ExpiryStatus>>;
  audit: {
    timestamp: Date;
    action: string;
    entityType: string;
    entityLabel: string | null;
    adminEmail: string;
    ipAddress: string | null;
  }[];
};

export async function buildExportData(): Promise<ExportData> {
  const now = new Date();

  const [persons, systems, resources, audit] = await Promise.all([
    prisma.person.findMany({
      where: { active: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        assignments: {
          where: { revokedAt: null },
          include: { role: { include: { system: true, riskLevel: true } } },
        },
        resourceAccesses: {
          where: { revokedAt: null },
          include: {
            resource: { include: { type: true, riskLevel: true } },
            method: true,
          },
        },
      },
    }),
    prisma.system.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        roles: { orderBy: { name: "asc" }, include: { riskLevel: true } },
      },
    }),
    prisma.resource.findMany({
      where: { active: true },
      orderBy: [{ type: { label: "asc" } }, { name: "asc" }],
      include: { type: true, riskLevel: true },
    }),
    prisma.auditLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 1000,
      select: {
        timestamp: true,
        action: true,
        entityType: true,
        entityLabel: true,
        adminEmail: true,
        ipAddress: true,
      },
    }),
  ]);

  let activeAssignments = 0;
  let needsRevisionCount = 0;
  let resourceAccessCount = 0;
  let resourceNeedsRevision = 0;
  const matrix: Record<string, Record<string, ExportAccess>> = {};
  const resourceMatrix: Record<string, Record<string, ExpiryStatus>> = {};
  // resourceId -> people who have access (collected during the person loop).
  const resourcePeople = new Map<string, ExportResource["people"]>();
  const statusRank: Record<ExpiryStatus, number> = {
    VALID: 0,
    EXPIRING: 1,
    EXPIRED: 2,
  };

  const exportPersons: ExportPerson[] = persons.map((p) => {
    const accesses: ExportAccess[] = p.assignments.map((a) => {
      activeAssignments += 1;
      if (needsRevision(a, now)) needsRevisionCount += 1;
      const access: ExportAccess = {
        systemName: a.role.system.name,
        roleName: a.role.name,
        riskLevel: a.role.riskLevel.label,
        source: a.source,
        status: getExpiryStatus(a.expiresAt, now),
        expiresAt: a.expiresAt,
        grantedAt: a.grantedAt,
      };
      const row = (matrix[p.id] ??= {});
      const existing = row[a.role.id];
      if (!(existing && existing.source === "DIRECT" && a.source === "GROUP")) {
        row[a.role.id] = access;
      }
      return access;
    });
    accesses.sort(
      (x, y) =>
        x.systemName.localeCompare(y.systemName, "nb") ||
        x.roleName.localeCompare(y.roleName, "nb"),
    );

    const resourceAccesses: ExportResourceAccess[] = p.resourceAccesses.map(
      (a) => {
        resourceAccessCount += 1;
        if (needsRevision(a, now)) resourceNeedsRevision += 1;
        const status = getExpiryStatus(a.expiresAt, now);
        // Per-resource people list (for the per-resource report view).
        const people = resourcePeople.get(a.resourceId) ?? [];
        people.push({
          name: `${p.firstName} ${p.lastName}`,
          method: a.method.label,
          credentialId: a.credentialId,
          status,
          expiresAt: a.expiresAt,
        });
        resourcePeople.set(a.resourceId, people);
        // Matrix cell: keep the most urgent status among methods.
        const rrow = (resourceMatrix[p.id] ??= {});
        if (
          rrow[a.resourceId] == null ||
          statusRank[status] > statusRank[rrow[a.resourceId]]
        ) {
          rrow[a.resourceId] = status;
        }
        return {
          resourceId: a.resourceId,
          resourceName: a.resource.name,
          typeLabel: a.resource.type.label,
          riskLevel: a.resource.riskLevel?.label ?? null,
          method: a.method.label,
          credentialId: a.credentialId,
          status,
          expiresAt: a.expiresAt,
          grantedAt: a.grantedAt,
        };
      },
    );
    resourceAccesses.sort(
      (x, y) =>
        x.resourceName.localeCompare(y.resourceName, "nb") ||
        x.method.localeCompare(y.method, "nb"),
    );

    return {
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      email: p.email,
      department: p.department,
      accesses,
      resourceAccesses,
    };
  });

  // Per-resource view: every active resource, with the people who can access it.
  const exportResources: ExportResource[] = resources.map((r) => {
    const people = (resourcePeople.get(r.id) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name, "nb"),
    );
    return {
      id: r.id,
      name: r.name,
      typeLabel: r.type.label,
      riskLevel: r.riskLevel?.label ?? null,
      location: r.location,
      people,
    };
  });

  // Per-system view: for each system role, who has it.
  const exportSystems: ExportSystem[] = systems.map((s) => {
    const rolePeople: ExportRolePeople[] = s.roles.map((role) => {
      const people = exportPersons
        .filter((p) => matrix[p.id]?.[role.id])
        .map((p) => {
          const cell = matrix[p.id][role.id];
          return {
            name: p.name,
            source: cell.source,
            status: cell.status,
            expiresAt: cell.expiresAt,
          };
        });
      return { roleName: role.name, riskLevel: role.riskLevel.label, people };
    });
    return {
      name: s.name,
      roles: s.roles.map((r) => ({
        id: r.id,
        name: r.name,
        riskLevel: r.riskLevel.label,
      })),
      rolePeople,
    };
  });

  return {
    generatedAt: now,
    summary: {
      persons: persons.length,
      systems: systems.length,
      activeAssignments,
      needsRevision: needsRevisionCount,
      resources: resources.length,
      resourceAccesses: resourceAccessCount,
      resourceNeedsRevision,
    },
    persons: exportPersons,
    systems: exportSystems,
    resources: exportResources,
    matrix,
    resourceMatrix,
    audit,
  };
}
