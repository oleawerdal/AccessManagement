import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { systemCreateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  return withApi(async () => {
    const systems = await prisma.system.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { roles: true } } },
    });
    return NextResponse.json(systems);
  });
}

export async function POST(req: NextRequest) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = systemCreateSchema.parse(await req.json());
    const created = await prisma.system.create({ data });
    return NextResponse.json(created, { status: 201 });
  });
}
