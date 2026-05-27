import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { assignmentRenewSchema, assignmentReviewSchema } from "@/lib/validators";
import {
  renewAssignment,
  markStillNeeded,
  assignmentInclude,
  assignmentLabel,
} from "@/lib/services/assignments";

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const body = await req.json();

    // "Still required" review action — logged, no expiry change.
    if (body?.action === "review") {
      const { note } = assignmentReviewSchema.parse(body);
      const result = await markStillNeeded({
        assignmentId: params.id,
        note,
      });
      return NextResponse.json(result);
    }

    const { expiresAt, notes } = assignmentRenewSchema.parse(body);
    const result = await renewAssignment({
      assignmentId: params.id,
      expiresAt,
      notes,
    });
    return NextResponse.json(result);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const before = await prisma.roleAssignment.findUniqueOrThrow({
      where: { id: params.id },
      include: assignmentInclude,
    });
    await prisma.roleAssignment.delete({ where: { id: params.id } });
    await writeAuditLog({
      action: "DELETE",
      entityType: "RoleAssignment",
      entityId: before.id,
      entityLabel: assignmentLabel(before),
      before: JSON.parse(JSON.stringify(before)),
    });
    return NextResponse.json({ ok: true });
  });
}
