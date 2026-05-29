import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { withApiV1, assertKeyCanMutate } from "@/lib/api-v1";
import { roleCreateSchema } from "@/lib/validators";
import { serializeRole } from "@/lib/v1/serializers";
import { parsePagination, paginated } from "@/lib/v1/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withApiV1(async () => {
    const sp = req.nextUrl.searchParams;
    const pagination = parsePagination(sp);
    const where: Prisma.RoleWhereInput = {};

    const systemId = sp.get("systemId")?.trim();
    if (systemId) where.systemId = systemId;

    const q = sp.get("q")?.trim();
    if (q) where.name = { contains: q, mode: "insensitive" };

    const [rows, total] = await Promise.all([
      prisma.role.findMany({
        where,
        orderBy: [{ system: { name: "asc" } }, { name: "asc" }],
        include: { system: { select: { id: true, name: true } }, riskLevel: true },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.role.count({ where }),
    ]);

    return paginated(rows.map(serializeRole), total, pagination);
  });
}

export async function POST(req: NextRequest) {
  return withApiV1(async (principal) => {
    assertKeyCanMutate(principal);
    const data = roleCreateSchema.parse(await req.json());
    const created = await prisma.role.create({
      data,
      include: { system: { select: { id: true, name: true } }, riskLevel: true },
    });
    return NextResponse.json(serializeRole(created), { status: 201 });
  });
}
