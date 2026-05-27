import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { roleUpdateSchema } from "@/lib/validators";

type Params = { params: { id: string } };

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: Params) {
  return withApi(async () => {
    const role = await prisma.role.findUniqueOrThrow({
      where: { id: params.id },
      include: { system: true },
    });
    return NextResponse.json(role);
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = roleUpdateSchema.parse(await req.json());
    const updated = await prisma.role.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    await prisma.role.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  });
}
