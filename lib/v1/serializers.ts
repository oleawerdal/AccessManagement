import type {
  Person,
  System,
  Role,
  RoleAssignment,
} from "@prisma/client";

import { getExpiryStatus, isAssignmentActive } from "@/lib/expiry";

// Stable, explicit response shapes for the external API. These are decoupled
// from the Prisma models on purpose: internal schema changes must not silently
// alter the public contract. Dates are emitted as ISO 8601 strings.

const iso = (d: Date | null | undefined): string | null =>
  d ? d.toISOString() : null;

export type PersonDTO = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string | null;
  department: string | null;
  jobTitle: string | null;
  employmentType: Person["employmentType"];
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializePerson(p: Person): PersonDTO {
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    employeeId: p.employeeId,
    department: p.department,
    jobTitle: p.jobTitle,
    employmentType: p.employmentType,
    startDate: iso(p.startDate),
    endDate: iso(p.endDate),
    active: p.active,
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export type SystemDTO = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  ownerEmail: string | null;
  url: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export function serializeSystem(s: System): SystemDTO {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    category: s.category,
    ownerEmail: s.ownerEmail,
    url: s.url,
    active: s.active,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export type RoleDTO = {
  id: string;
  systemId: string;
  name: string;
  description: string | null;
  riskLevel: Role["riskLevel"];
  createdAt: string;
  updatedAt: string;
  system?: { id: string; name: string };
};

export function serializeRole(
  r: Role & { system?: { id: string; name: string } },
): RoleDTO {
  return {
    id: r.id,
    systemId: r.systemId,
    name: r.name,
    description: r.description,
    riskLevel: r.riskLevel,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    ...(r.system ? { system: { id: r.system.id, name: r.system.name } } : {}),
  };
}

export type AssignmentDTO = {
  id: string;
  personId: string;
  roleId: string;
  source: RoleAssignment["source"];
  sourceGroupId: string | null;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  expiryStatus: "VALID" | "EXPIRING" | "EXPIRED";
  grantedAt: string;
  grantedBy: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revokeReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export function serializeAssignment(a: RoleAssignment): AssignmentDTO {
  const status: AssignmentDTO["status"] = a.revokedAt
    ? "REVOKED"
    : isAssignmentActive(a)
      ? "ACTIVE"
      : "EXPIRED";

  return {
    id: a.id,
    personId: a.personId,
    roleId: a.roleId,
    source: a.source,
    sourceGroupId: a.sourceGroupId,
    status,
    expiryStatus: getExpiryStatus(a.expiresAt),
    grantedAt: a.grantedAt.toISOString(),
    grantedBy: a.grantedBy,
    expiresAt: iso(a.expiresAt),
    revokedAt: iso(a.revokedAt),
    revokedBy: a.revokedBy,
    revokeReason: a.revokeReason,
    notes: a.notes,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}
