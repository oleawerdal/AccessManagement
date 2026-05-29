import type {
  AdminRole,
  AssignmentSource,
  AuditAction,
  EmploymentType,
  RiskLevel,
} from "@prisma/client";

export const employmentTypeLabel: Record<EmploymentType, string> = {
  EMPLOYEE: "Ansatt",
  CONSULTANT: "Konsulent",
  EXTERNAL: "Ekstern",
  INTERN: "Praktikant",
};

export const riskLevelLabel: Record<RiskLevel, string> = {
  LOW: "Lav",
  NORMAL: "Normal",
  HIGH: "Høy",
  CRITICAL: "Kritisk",
};

// Risk colors: LOW = grey, NORMAL = blue, HIGH = orange, CRITICAL = red.
export const riskLevelClasses: Record<RiskLevel, string> = {
  LOW: "bg-risk-low/10 text-risk-low border-risk-low/20",
  NORMAL: "bg-risk-normal/10 text-risk-normal border-risk-normal/25",
  HIGH: "bg-risk-high/10 text-risk-high border-risk-high/25",
  CRITICAL: "bg-risk-critical/10 text-risk-critical border-risk-critical/25",
};

export const assignmentSourceLabel: Record<AssignmentSource, string> = {
  DIRECT: "Direkte",
  GROUP: "Gruppe",
};

export const auditActionLabel: Record<AuditAction, string> = {
  CREATE: "Opprettet",
  UPDATE: "Endret",
  DELETE: "Slettet",
  GRANT: "Tildelt",
  REVOKE: "Revokert",
  LOGIN: "Innlogging",
  LOGIN_FAILED: "Mislykket innlogging",
  EXPORT: "Eksport",
};

export const auditActionClasses: Record<AuditAction, string> = {
  CREATE: "bg-risk-normal/10 text-risk-normal border-risk-normal/25",
  UPDATE: "bg-muted text-foreground border-border",
  DELETE: "bg-risk-critical/10 text-risk-critical border-risk-critical/25",
  GRANT: "bg-status-valid/10 text-status-valid border-status-valid/25",
  REVOKE: "bg-risk-high/10 text-risk-high border-risk-high/25",
  LOGIN: "bg-muted text-muted-foreground border-border",
  LOGIN_FAILED: "bg-risk-critical/10 text-risk-critical border-risk-critical/25",
  EXPORT: "bg-primary/10 text-primary border-primary/25",
};

export const adminRoleLabel: Record<AdminRole, string> = {
  ADMIN: "Administrator",
  AUDITOR: "Revisor",
};

export const entityTypeLabel: Record<string, string> = {
  Person: "Person",
  System: "System",
  Role: "Rolle",
  Group: "Gruppe",
  GroupRole: "Grupperolle",
  GroupMembership: "Gruppemedlemskap",
  RoleAssignment: "Tilordning",
  AdminUser: "Adminbruker",
  ApiKey: "API-nøkkel",
  Export: "Eksport",
};
