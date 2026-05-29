import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApiV1, assertKeyCanMutate } from "@/lib/api-v1";
import { writeAuditLog } from "@/lib/audit";
import { assignmentRenewSchema } from "@/lib/validators";
import {
  renewAssignment,
  assignmentInclude,
  assignmentLabel,
} from "@/lib/services/assignments";
import { serializeAssignment } from "@/lib/v1/serializers";

type Params = { params: { id: string } };

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: Params) {
  return withApiV1(async () => {
    const assignment = await prisma.roleAssignment.findUniqueOrThrow({
      where: { id: params.id },
    });
    return NextResponse.json(serializeAssignment(assignment));
  });
}

// Renew (or change) expiry/notes. Reactivates a revoked assignment.
export async function PATCH(req: NextRequest, { params }: Params) {
  return withApiV1(async (principal) => {
    assertKeyCanMutate(principal);
    const { expiresAt, notes } = assignmentRenewSchema.parse(await req.json());
    const result = await renewAssignment({
      assignmentId: params.id,
      expiresAt,
      notes,
    });
    return NextResponse.json(serializeAssignment(result));
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withApiV1(async (principal) => {
    assertKeyCanMutate(principal);
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
    return NextResponse.json({ deleted: true, id: params.id });
  });
}
