import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { assignmentCreateSchema } from "@/lib/validators";
import { grantDirect, assignmentInclude } from "@/lib/services/assignments";

export async function GET(req: NextRequest) {
  return withApi(async () => {
    const sp = req.nextUrl.searchParams;
    const where: Prisma.RoleAssignmentWhereInput = {};
    const personId = sp.get("personId");
    const roleId = sp.get("roleId");
    const systemId = sp.get("systemId");
    if (personId) where.personId = personId;
    if (roleId) where.roleId = roleId;
    if (systemId) where.role = { systemId };
    if (sp.get("needsRevision") === "true") {
      where.revokedAt = null;
      where.expiresAt = { lt: new Date() };
    }

    const assignments = await prisma.roleAssignment.findMany({
      where,
      include: assignmentInclude,
      orderBy: { grantedAt: "desc" },
    });
    return NextResponse.json(assignments);
  });
}

export async function POST(req: NextRequest) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = assignmentCreateSchema.parse(await req.json());
    const assignment = await grantDirect({
      personId: data.personId,
      roleId: data.roleId,
      expiresAt: data.expiresAt ?? null,
      notes: data.notes,
      grantedBy: session.user.email ?? undefined,
    });
    return NextResponse.json(assignment, { status: 201 });
  });
}
