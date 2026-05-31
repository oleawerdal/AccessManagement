import { Prisma, PrismaClient, type AuditAction } from "@prisma/client";
import { getAuditContext, type AuditContext } from "./audit-context";

/**
 * Dedicated, UN-extended client used solely to write audit rows. Keeping it
 * separate from the audited client guarantees that writing a log can never
 * recurse back into the audit extension.
 */
const globalForAudit = globalThis as unknown as {
  auditWriter?: PrismaClient;
};
const auditWriter =
  globalForAudit.auditWriter ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") {
  globalForAudit.auditWriter = auditWriter;
}

// Content models whose CRUD is auto-audited. RoleAssignment is intentionally
// excluded: its lifecycle is logged via the explicit GRANT/REVOKE helpers so
// the audit actions carry domain meaning instead of generic CREATE/UPDATE.
const AUDITED_MODELS = new Set([
  "Person",
  "System",
  "Role",
  "Group",
  "GroupRole",
  "GroupMembership",
  "AdminUser",
  "ResourceType",
  "AccessMethod",
  "Resource",
  "Credential",
]);

const SINGLE_WRITE_OPS = new Set(["create", "update", "delete", "upsert"]);

function delegateFor(client: PrismaClient, model: string) {
  const key = model.charAt(0).toLowerCase() + model.slice(1);
  return (client as unknown as Record<string, { findUnique: Function }>)[key];
}

/** Strip sensitive fields and normalise Dates to a JSON-safe shape. */
function sanitize(model: string, record: unknown): Prisma.InputJsonValue | undefined {
  if (record == null) return undefined;
  const clone = JSON.parse(JSON.stringify(record)) as Record<string, unknown>;
  if (model === "AdminUser") {
    delete clone.passwordHash;
  }
  return clone as Prisma.InputJsonValue;
}

export function entityLabel(model: string, record: unknown): string | undefined {
  if (!record || typeof record !== "object") return undefined;
  const r = record as Record<string, unknown>;
  switch (model) {
    case "Person":
      return [r.firstName, r.lastName].filter(Boolean).join(" ") || String(r.email ?? "");
    case "AdminUser":
      return String(r.name ?? r.email ?? "");
    case "System":
    case "Role":
    case "Group":
    case "Resource":
      return String(r.name ?? r.id ?? "");
    case "ResourceType":
    case "AccessMethod":
      return String(r.label ?? r.id ?? "");
    case "Credential":
      return [r.label, r.identifier].filter(Boolean).join(" · ") || String(r.id ?? "");
    default:
      return r.id ? String(r.id) : undefined;
  }
}

type WriteLogInput = {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  context?: Partial<AuditContext>;
};

/** Low-level audit writer. Never throws into the caller's transaction. */
export async function writeAuditLog(input: WriteLogInput): Promise<void> {
  const ctx = { ...getAuditContext(), ...input.context };
  try {
    await auditWriter.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? undefined,
        entityLabel: input.entityLabel ?? undefined,
        adminUserId: ctx.adminUserId,
        adminEmail: ctx.adminEmail ?? "system",
        before: input.before,
        after: input.after,
        metadata: input.metadata,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    });
  } catch (err) {
    // Audit logging must never break the underlying operation; surface for ops.
    console.error("[audit] failed to write log", err);
  }
}

/**
 * Prisma client extension that auto-logs CREATE/UPDATE/DELETE for content
 * models. Only fires when an audit context is present, so we always know who
 * acted. AuditLog writes go through a separate client, so this can never loop.
 */
export function auditExtension() {
  return Prisma.defineExtension((client) =>
    client.$extends({
      name: "audit",
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const ctx = getAuditContext();
            if (
              !ctx ||
              ctx.skip ||
              !model ||
              !AUDITED_MODELS.has(model) ||
              !SINGLE_WRITE_OPS.has(operation)
            ) {
              return query(args);
            }

            const typedArgs = args as { where?: Prisma.JsonObject };
            let before: unknown = null;
            if (
              (operation === "update" ||
                operation === "delete" ||
                operation === "upsert") &&
              typedArgs.where
            ) {
              before = await delegateFor(auditWriter, model)
                .findUnique({ where: typedArgs.where })
                .catch(() => null);
            }

            const result = (await query(args)) as { id?: string } | null;

            let action: AuditAction;
            if (operation === "delete") action = "DELETE";
            else if (operation === "create") action = "CREATE";
            else if (operation === "upsert") action = before ? "UPDATE" : "CREATE";
            else action = "UPDATE";

            const labelSource = action === "DELETE" ? before : result ?? before;
            await writeAuditLog({
              action,
              entityType: model,
              entityId: result?.id ?? (before as { id?: string } | null)?.id,
              entityLabel: entityLabel(model, labelSource),
              before: sanitize(model, before),
              after: action === "DELETE" ? undefined : sanitize(model, result),
            });

            return result;
          },
        },
      },
    }),
  );
}

// --- Explicit helpers for non-CRUD / domain-specific actions ----------------

export function logLogin(input: {
  adminUserId: string;
  adminEmail: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  return writeAuditLog({
    action: "LOGIN",
    entityType: "AdminUser",
    entityId: input.adminUserId,
    entityLabel: input.adminEmail,
    context: {
      adminUserId: input.adminUserId,
      adminEmail: input.adminEmail,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });
}

export function logLoginFailed(input: {
  adminEmail: string;
  reason: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  return writeAuditLog({
    action: "LOGIN_FAILED",
    entityType: "AdminUser",
    entityLabel: input.adminEmail,
    metadata: { reason: input.reason },
    context: {
      adminEmail: input.adminEmail,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });
}

export function logExport(input: {
  format: "PDF" | "EXCEL";
  view: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return writeAuditLog({
    action: "EXPORT",
    entityType: "Export",
    entityLabel: `${input.format} – ${input.view}`,
    metadata: input.metadata ?? { format: input.format, view: input.view },
  });
}

export function logGrant(input: {
  assignmentId: string;
  label: string;
  after: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
}) {
  return writeAuditLog({
    action: "GRANT",
    entityType: "RoleAssignment",
    entityId: input.assignmentId,
    entityLabel: input.label,
    after: input.after,
    metadata: input.metadata,
  });
}

export function logRevoke(input: {
  assignmentId: string;
  label: string;
  before: Prisma.InputJsonValue;
  after: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
}) {
  return writeAuditLog({
    action: "REVOKE",
    entityType: "RoleAssignment",
    entityId: input.assignmentId,
    entityLabel: input.label,
    before: input.before,
    after: input.after,
    metadata: input.metadata,
  });
}

export function logAssignmentUpdate(input: {
  assignmentId: string;
  label: string;
  before: Prisma.InputJsonValue;
  after: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
}) {
  return writeAuditLog({
    action: "UPDATE",
    entityType: "RoleAssignment",
    entityId: input.assignmentId,
    entityLabel: input.label,
    before: input.before,
    after: input.after,
    metadata: input.metadata,
  });
}

// --- Physical resource access (GRANT/REVOKE/UPDATE on ResourceAccess) --------

export function logResourceAccess(input: {
  action: "GRANT" | "REVOKE" | "UPDATE";
  accessId: string;
  label: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
}) {
  return writeAuditLog({
    action: input.action,
    entityType: "ResourceAccess",
    entityId: input.accessId,
    entityLabel: input.label,
    before: input.before,
    after: input.after,
    metadata: input.metadata,
  });
}
