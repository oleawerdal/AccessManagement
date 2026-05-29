import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { ssoSettingsSchema } from "@/lib/validators";
import { invalidateSsoCache } from "@/lib/sso-config";

export const dynamic = "force-dynamic";

// Never expose clientSecret; `hasClientSecret` tells the UI a secret is stored.
function serialize(s: {
  enabled: boolean;
  clientId: string | null;
  clientSecret: string | null;
  issuer: string | null;
  updatedBy: string | null;
  updatedAt: Date;
} | null) {
  if (!s) return null;
  const { clientSecret, ...rest } = s;
  return { ...rest, hasClientSecret: Boolean(clientSecret) };
}

export async function GET() {
  return withApi(async (session) => {
    assertCanMutate(session);
    const settings = await prisma.ssoSettings.findUnique({
      where: { id: "default" },
    });
    return NextResponse.json(serialize(settings));
  });
}

export async function PUT(req: NextRequest) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = ssoSettingsSchema.parse(await req.json());

    const existing = await prisma.ssoSettings.findUnique({
      where: { id: "default" },
    });
    // Keep the stored secret when the field is left blank on update.
    const clientSecret =
      data.clientSecret && data.clientSecret.length > 0
        ? data.clientSecret
        : existing?.clientSecret ?? null;
    const clientId = data.clientId ?? null;
    const issuer = data.issuer ?? null;

    // Enabling requires a complete configuration.
    if (data.enabled && !(clientId && clientSecret && issuer)) {
      return NextResponse.json(
        {
          error:
            "For å aktivere SSO må client-ID, client-secret og issuer være satt.",
        },
        { status: 400 },
      );
    }

    const saved = await prisma.ssoSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        enabled: data.enabled,
        clientId,
        clientSecret,
        issuer,
        updatedBy: session.user.email ?? undefined,
      },
      update: {
        enabled: data.enabled,
        clientId,
        clientSecret,
        issuer,
        updatedBy: session.user.email ?? undefined,
      },
    });

    invalidateSsoCache();

    await writeAuditLog({
      action: "UPDATE",
      entityType: "SsoSettings",
      entityId: saved.id,
      entityLabel: "Entra ID SSO",
      // Never log the client secret.
      after: { enabled: saved.enabled, clientId: saved.clientId, issuer: saved.issuer },
    });

    return NextResponse.json(serialize(saved));
  });
}
