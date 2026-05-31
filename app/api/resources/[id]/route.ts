import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { resourceUpdateSchema } from "@/lib/validators";

type Params = { params: { id: string } };

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: Params) {
  return withApi(async () => {
    const resource = await prisma.resource.findUniqueOrThrow({
      where: { id: params.id },
      include: { type: true, riskLevel: true, ownerPerson: true },
    });
    return NextResponse.json(resource);
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = resourceUpdateSchema.parse(await req.json());
    const updated = await prisma.resource.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    await prisma.resource.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  });
}
