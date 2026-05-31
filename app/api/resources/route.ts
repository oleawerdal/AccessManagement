import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { resourceCreateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withApi(async () => {
    const sp = req.nextUrl.searchParams;
    const where: Prisma.ResourceWhereInput = {};
    if (sp.get("active") === "true") where.active = true;
    if (sp.get("typeId")) where.typeId = sp.get("typeId")!;

    const resources = await prisma.resource.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        type: true,
        riskLevel: true,
        ownerPerson: { select: { firstName: true, lastName: true } },
        _count: { select: { accesses: { where: { revokedAt: null } } } },
      },
    });
    return NextResponse.json(resources);
  });
}

export async function POST(req: NextRequest) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = resourceCreateSchema.parse(await req.json());
    const created = await prisma.resource.create({ data });
    return NextResponse.json(created, { status: 201 });
  });
}
