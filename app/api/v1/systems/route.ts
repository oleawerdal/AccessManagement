import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { withApiV1, assertKeyCanMutate } from "@/lib/api-v1";
import { systemCreateSchema } from "@/lib/validators";
import { serializeSystem } from "@/lib/v1/serializers";
import { parsePagination, parseBool, paginated } from "@/lib/v1/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withApiV1(async () => {
    const sp = req.nextUrl.searchParams;
    const pagination = parsePagination(sp);
    const where: Prisma.SystemWhereInput = {};

    const active = parseBool(sp.get("active"));
    if (active !== undefined) where.active = active;

    const q = sp.get("q")?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.system.findMany({
        where,
        orderBy: { name: "asc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.system.count({ where }),
    ]);

    return paginated(rows.map(serializeSystem), total, pagination);
  });
}

export async function POST(req: NextRequest) {
  return withApiV1(async (principal) => {
    assertKeyCanMutate(principal);
    const data = systemCreateSchema.parse(await req.json());
    const created = await prisma.system.create({ data });
    return NextResponse.json(serializeSystem(created), { status: 201 });
  });
}
