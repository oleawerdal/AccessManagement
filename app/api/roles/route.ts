import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { roleCreateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withApi(async () => {
    const systemId = req.nextUrl.searchParams.get("systemId")?.trim();
    const roles = await prisma.role.findMany({
      where: systemId ? { systemId } : undefined,
      orderBy: [{ system: { name: "asc" } }, { name: "asc" }],
      include: { system: { select: { id: true, name: true } } },
    });
    return NextResponse.json(roles);
  });
}

export async function POST(req: NextRequest) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = roleCreateSchema.parse(await req.json());
    const created = await prisma.role.create({ data });
    return NextResponse.json(created, { status: 201 });
  });
}
