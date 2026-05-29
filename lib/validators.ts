import { z } from "zod";

// --- Shared --------------------------------------------------------------
const optionalString = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .or(z.literal("").transform(() => undefined));

// Accepts an ISO date string or empty; yields a Date or undefined.
const optionalDate = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (v ? new Date(v) : undefined))
  .refine((v) => v === undefined || !Number.isNaN(v.getTime()), {
    message: "Ugyldig dato.",
  });

// --- Auth ----------------------------------------------------------------
export const loginSchema = z.object({
  email: z.string().email("Ugyldig e-postadresse."),
  password: z.string().min(1, "Passord er påkrevd."),
});
export type LoginInput = z.infer<typeof loginSchema>;

// --- Person --------------------------------------------------------------
export const employmentTypeEnum = z.enum([
  "EMPLOYEE",
  "CONSULTANT",
  "EXTERNAL",
  "INTERN",
]);

export const personCreateSchema = z.object({
  firstName: z.string().trim().min(1, "Fornavn er påkrevd.").max(100),
  lastName: z.string().trim().min(1, "Etternavn er påkrevd.").max(100),
  email: z.string().email("Ugyldig e-postadresse."),
  employeeId: optionalString,
  department: optionalString,
  jobTitle: optionalString,
  employmentType: employmentTypeEnum.default("EMPLOYEE"),
  startDate: optionalDate,
  endDate: optionalDate,
  active: z.boolean().default(true),
  notes: optionalString,
});
export const personUpdateSchema = personCreateSchema.partial();
export type PersonInput = z.infer<typeof personCreateSchema>;

// --- System --------------------------------------------------------------
export const systemCreateSchema = z.object({
  name: z.string().trim().min(1, "Navn er påkrevd.").max(150),
  description: optionalString,
  category: optionalString,
  ownerEmail: z
    .string()
    .email("Ugyldig e-postadresse.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  // Person who owns the system. null clears it; undefined leaves it unchanged.
  ownerPersonId: z
    .string()
    .min(1)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  url: z
    .string()
    .url("Ugyldig URL.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  active: z.boolean().default(true),
});
export const systemUpdateSchema = systemCreateSchema.partial();
export type SystemInput = z.infer<typeof systemCreateSchema>;

// --- Role ----------------------------------------------------------------
export const riskLevelEnum = z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]);

export const roleCreateSchema = z.object({
  systemId: z.string().min(1, "System er påkrevd."),
  name: z.string().trim().min(1, "Navn er påkrevd.").max(150),
  description: optionalString,
  riskLevel: riskLevelEnum.default("NORMAL"),
});
export const roleUpdateSchema = roleCreateSchema.partial().omit({ systemId: true });
export type RoleInput = z.infer<typeof roleCreateSchema>;

// --- Group ---------------------------------------------------------------
export const groupRoleInputSchema = z.object({
  roleId: z.string().min(1),
  defaultExpiryDays: z
    .number()
    .int()
    .positive()
    .max(3650)
    .nullable()
    .optional(),
});

export const groupCreateSchema = z.object({
  name: z.string().trim().min(1, "Navn er påkrevd.").max(150),
  description: optionalString,
  roles: z.array(groupRoleInputSchema).default([]),
});
export const groupUpdateSchema = groupCreateSchema.partial();
export type GroupInput = z.infer<typeof groupCreateSchema>;

export const groupMemberSchema = z.object({
  personId: z.string().min(1, "Person er påkrevd."),
});

// --- Assignment ----------------------------------------------------------
export const assignmentCreateSchema = z.object({
  personId: z.string().min(1, "Person er påkrevd."),
  roleId: z.string().min(1, "Rolle er påkrevd."),
  expiresAt: optionalDate,
  notes: optionalString,
});
export type AssignmentInput = z.infer<typeof assignmentCreateSchema>;

export const assignmentRenewSchema = z.object({
  expiresAt: z
    .union([z.string(), z.null()])
    .transform((v) => (v ? new Date(v) : null))
    .refine((v) => v === null || !Number.isNaN(v.getTime()), {
      message: "Ugyldig dato.",
    }),
  notes: optionalString,
});

export const assignmentRevokeSchema = z.object({
  reason: z.string().trim().min(1, "Begrunnelse er påkrevd.").max(1000),
});

// "Still required" review action — logs that the access was reviewed and kept.
export const assignmentReviewSchema = z.object({
  note: optionalString,
});

// --- Audit query ---------------------------------------------------------
export const auditQuerySchema = z.object({
  adminUserId: z.string().optional(),
  action: z
    .enum([
      "CREATE",
      "UPDATE",
      "DELETE",
      "GRANT",
      "REVOKE",
      "LOGIN",
      "LOGIN_FAILED",
      "EXPORT",
    ])
    .optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

// --- Admin user (settings) ----------------------------------------------
export const adminUserCreateSchema = z.object({
  email: z.string().email("Ugyldig e-postadresse."),
  name: z.string().trim().min(1, "Navn er påkrevd.").max(150),
  // Optional: when omitted the user is invited by e-mail to set their own.
  password: z
    .string()
    .min(8, "Minst 8 tegn.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  role: z.enum(["ADMIN", "AUDITOR"]).default("ADMIN"),
  active: z.boolean().default(true),
});
export const adminUserUpdateSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  password: z.string().min(8).optional().or(z.literal("").transform(() => undefined)),
  role: z.enum(["ADMIN", "AUDITOR"]).optional(),
  active: z.boolean().optional(),
});

// --- API keys (external REST API) ---------------------------------------
export const apiKeyCreateSchema = z.object({
  name: z.string().trim().min(1, "Navn er påkrevd.").max(150),
  role: z.enum(["ADMIN", "AUDITOR"]).default("ADMIN"),
  expiresAt: optionalDate,
});
export const apiKeyUpdateSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  role: z.enum(["ADMIN", "AUDITOR"]).optional(),
  active: z.boolean().optional(),
  // Accept null to clear an existing expiry, a date string to set one.
  expiresAt: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v === undefined ? undefined : v ? new Date(v) : null))
    .refine((v) => v == null || !Number.isNaN(v.getTime()), {
      message: "Ugyldig dato.",
    }),
});

// --- SMTP settings -------------------------------------------------------
export const smtpSettingsSchema = z.object({
  host: z.string().trim().min(1, "Vert er påkrevd.").max(255),
  port: z.coerce.number().int().min(1).max(65535).default(587),
  secure: z.boolean().default(false),
  username: optionalString,
  // Empty/omitted on update keeps the stored password.
  password: z.string().max(500).optional(),
  fromEmail: z.string().email("Ugyldig avsenderadresse."),
  fromName: z.string().trim().min(1, "Avsendernavn er påkrevd.").max(150),
  enabled: z.boolean().default(false),
});

// --- SSO (Microsoft Entra ID) settings -----------------------------------
export const ssoSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  clientId: optionalString,
  // Empty/omitted on update keeps the stored secret.
  clientSecret: z.string().max(500).optional(),
  issuer: z
    .string()
    .url("Ugyldig issuer-URL.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

// --- Password reset ------------------------------------------------------
export const passwordResetRequestSchema = z.object({
  email: z.string().email("Ugyldig e-postadresse."),
});
export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, "Mangler token."),
  password: z.string().min(8, "Minst 8 tegn."),
});
