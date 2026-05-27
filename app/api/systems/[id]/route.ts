import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { systemUpdateSchema } from "@/lib/validators";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  return withApi(async () => {
    const system = await prisma.system.findUniqueOrThrow({
      where: { id: params.id },
      include: {
        roles: {
          orderBy: { name: "asc" },
          include: { _count: { select: { assignments: true } } },
        },
      },
    });
    return NextResponse.json(system);
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = systemUpdateSchema.parse(await req.json());
    const updated = await prisma.system.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    await prisma.system.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  });
}
