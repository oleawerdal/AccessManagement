import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { apiKeyCreateSchema } from "@/lib/validators";
import { generateApiKey } from "@/lib/api-key";

// Never expose keyHash. `prefix` is the non-secret identifier shown in the UI.
const SAFE_SELECT = {
  id: true,
  name: true,
  prefix: true,
  role: true,
  active: true,
  expiresAt: true,
  lastUsedAt: true,
  createdBy: true,
  createdAt: true,
} as const;

export const dynamic = "force-dynamic";

export async function GET() {
  return withApi(async (session) => {
    assertCanMutate(session);
    const keys = await prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      select: SAFE_SELECT,
    });
    return NextResponse.json(keys);
  });
}

export async function POST(req: NextRequest) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = apiKeyCreateSchema.parse(await req.json());
    const { token, prefix, keyHash } = generateApiKey();

    const created = await prisma.apiKey.create({
      data: {
        name: data.name,
        role: data.role,
        expiresAt: data.expiresAt ?? null,
        prefix,
        keyHash,
        createdBy: session.user.email ?? undefined,
      },
      select: SAFE_SELECT,
    });

    await writeAuditLog({
      action: "CREATE",
      entityType: "ApiKey",
      entityId: created.id,
      entityLabel: created.name,
      after: { id: created.id, name: created.name, prefix, role: created.role },
    });

    // The plaintext token is returned exactly once and never stored.
    return NextResponse.json({ ...created, token }, { status: 201 });
  });
}
