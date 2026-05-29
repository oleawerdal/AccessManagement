import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { apiKeyUpdateSchema } from "@/lib/validators";

type Params = { params: { id: string } };

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

export async function PATCH(req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = apiKeyUpdateSchema.parse(await req.json());
    const updated = await prisma.apiKey.update({
      where: { id: params.id },
      data,
      select: SAFE_SELECT,
    });
    await writeAuditLog({
      action: "UPDATE",
      entityType: "ApiKey",
      entityId: updated.id,
      entityLabel: updated.name,
      after: {
        name: updated.name,
        role: updated.role,
        active: updated.active,
      },
    });
    return NextResponse.json(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const before = await prisma.apiKey.findUniqueOrThrow({
      where: { id: params.id },
      select: { id: true, name: true, prefix: true },
    });
    await prisma.apiKey.delete({ where: { id: params.id } });
    await writeAuditLog({
      action: "DELETE",
      entityType: "ApiKey",
      entityId: before.id,
      entityLabel: before.name,
      before,
    });
    return NextResponse.json({ ok: true });
  });
}
