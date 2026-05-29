import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { withApiV1, assertKeyCanMutate } from "@/lib/api-v1";
import { assignmentCreateSchema } from "@/lib/validators";
import { grantDirect } from "@/lib/services/assignments";
import { serializeAssignment } from "@/lib/v1/serializers";
import { parsePagination, paginated } from "@/lib/v1/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withApiV1(async () => {
    const sp = req.nextUrl.searchParams;
    const pagination = parsePagination(sp);
    const where: Prisma.RoleAssignmentWhereInput = {};

    const personId = sp.get("personId")?.trim();
    const roleId = sp.get("roleId")?.trim();
    const systemId = sp.get("systemId")?.trim();
    if (personId) where.personId = personId;
    if (roleId) where.roleId = roleId;
    if (systemId) where.role = { systemId };

    const status = sp.get("status")?.trim().toUpperCase();
    const now = new Date();
    if (status === "REVOKED") {
      where.revokedAt = { not: null };
    } else if (status === "ACTIVE") {
      where.revokedAt = null;
      where.OR = [{ expiresAt: null }, { expiresAt: { gt: now } }];
    } else if (status === "EXPIRED") {
      where.revokedAt = null;
      where.expiresAt = { lte: now };
    }

    const [rows, total] = await Promise.all([
      prisma.roleAssignment.findMany({
        where,
        orderBy: { grantedAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.roleAssignment.count({ where }),
    ]);

    return paginated(rows.map(serializeAssignment), total, pagination);
  });
}

export async function POST(req: NextRequest) {
  return withApiV1(async (principal) => {
    assertKeyCanMutate(principal);
    const data = assignmentCreateSchema.parse(await req.json());
    const assignment = await grantDirect({
      personId: data.personId,
      roleId: data.roleId,
      expiresAt: data.expiresAt ?? null,
      notes: data.notes,
      grantedBy: `api:${principal.name}`,
    });
    return NextResponse.json(serializeAssignment(assignment), { status: 201 });
  });
}
