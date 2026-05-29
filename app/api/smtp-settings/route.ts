import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { smtpSettingsSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

// Returns settings without the password; `hasPassword` tells the UI whether a
// secret is already stored (so it can leave the field blank to keep it).
function serialize(s: {
  host: string;
  port: number;
  secure: boolean;
  username: string | null;
  password: string | null;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
} | null) {
  if (!s) return null;
  const { password, ...rest } = s;
  return { ...rest, hasPassword: Boolean(password) };
}

export async function GET() {
  return withApi(async (session) => {
    assertCanMutate(session);
    const settings = await prisma.smtpSettings.findUnique({
      where: { id: "default" },
    });
    return NextResponse.json(serialize(settings));
  });
}

export async function PUT(req: NextRequest) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = smtpSettingsSchema.parse(await req.json());

    const existing = await prisma.smtpSettings.findUnique({
      where: { id: "default" },
    });
    // Keep the stored password when the field is left blank on update.
    const password =
      data.password && data.password.length > 0
        ? data.password
        : existing?.password ?? null;

    const saved = await prisma.smtpSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        host: data.host,
        port: data.port,
        secure: data.secure,
        username: data.username ?? null,
        password,
        fromEmail: data.fromEmail,
        fromName: data.fromName,
        enabled: data.enabled,
        updatedBy: session.user.email ?? undefined,
      },
      update: {
        host: data.host,
        port: data.port,
        secure: data.secure,
        username: data.username ?? null,
        password,
        fromEmail: data.fromEmail,
        fromName: data.fromName,
        enabled: data.enabled,
        updatedBy: session.user.email ?? undefined,
      },
    });

    await writeAuditLog({
      action: "UPDATE",
      entityType: "SmtpSettings",
      entityId: saved.id,
      entityLabel: `${saved.fromName} <${saved.fromEmail}>`,
      // Never log the password.
      after: {
        host: saved.host,
        port: saved.port,
        secure: saved.secure,
        username: saved.username,
        fromEmail: saved.fromEmail,
        fromName: saved.fromName,
        enabled: saved.enabled,
      },
    });

    return NextResponse.json(serialize(saved));
  });
}
