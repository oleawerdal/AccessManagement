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

export type ExportPerson = {
  id: string;
  name: string;
  email: string;
  department: string | null;
  accesses: ExportAccess[];
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
  };
  persons: ExportPerson[];
  systems: ExportSystem[];
  // matrix[personId][roleId] = status
  matrix: Record<string, Record<string, ExportAccess>>;
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

  const [persons, systems, audit] = await Promise.all([
    prisma.person.findMany({
      where: { active: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        assignments: {
          where: { revokedAt: null },
          include: { role: { include: { system: true, riskLevel: true } } },
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
  const matrix: Record<string, Record<string, ExportAccess>> = {};

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
    return {
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      email: p.email,
      department: p.department,
      accesses,
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
    },
    persons: exportPersons,
    systems: exportSystems,
    matrix,
    audit,
  };
}
