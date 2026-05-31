import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { resourceAccessRenewSchema } from "@/lib/validators";
import {
  renewResourceAccess,
  markCredentialReturned,
  accessInclude,
  resourceAccessLabel,
} from "@/lib/services/resource-access";

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const body = await req.json();

    // Toggle "physical credential returned" without changing the expiry.
    if (body?.action === "credential-returned") {
      const result = await markCredentialReturned({
        accessId: params.id,
        returned: body.returned !== false,
      });
      return NextResponse.json(result);
    }

    const { expiresAt, notes } = resourceAccessRenewSchema.parse(body);
    const result = await renewResourceAccess({
      accessId: params.id,
      expiresAt,
      notes,
    });
    return NextResponse.json(result);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const before = await prisma.resourceAccess.findUniqueOrThrow({
      where: { id: params.id },
      include: accessInclude,
    });
    await prisma.resourceAccess.delete({ where: { id: params.id } });
    await writeAuditLog({
      action: "DELETE",
      entityType: "ResourceAccess",
      entityId: before.id,
      entityLabel: resourceAccessLabel(before),
      before: JSON.parse(JSON.stringify(before)),
    });
    return NextResponse.json({ ok: true });
  });
}
