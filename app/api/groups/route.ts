import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { groupCreateSchema } from "@/lib/validators";

export async function GET() {
  return withApi(async () => {
    const groups = await prisma.group.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { groupRoles: true, memberships: true } },
      },
    });
    return NextResponse.json(groups);
  });
}

export async function POST(req: NextRequest) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = groupCreateSchema.parse(await req.json());
    const created = await prisma.group.create({
      data: {
        name: data.name,
        description: data.description,
        groupRoles: {
          create: data.roles.map((r) => ({
            roleId: r.roleId,
            defaultExpiryDays: r.defaultExpiryDays ?? null,
          })),
        },
      },
      include: { groupRoles: true },
    });
    return NextResponse.json(created, { status: 201 });
  });
}
