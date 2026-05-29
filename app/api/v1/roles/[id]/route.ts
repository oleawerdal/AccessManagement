import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApiV1, assertKeyCanMutate } from "@/lib/api-v1";
import { roleUpdateSchema } from "@/lib/validators";
import { serializeRole } from "@/lib/v1/serializers";

type Params = { params: { id: string } };

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: Params) {
  return withApiV1(async () => {
    const role = await prisma.role.findUniqueOrThrow({
      where: { id: params.id },
      include: { system: { select: { id: true, name: true } } },
    });
    return NextResponse.json(serializeRole(role));
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return withApiV1(async (principal) => {
    assertKeyCanMutate(principal);
    const data = roleUpdateSchema.parse(await req.json());
    const updated = await prisma.role.update({
      where: { id: params.id },
      data,
      include: { system: { select: { id: true, name: true } } },
    });
    return NextResponse.json(serializeRole(updated));
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withApiV1(async (principal) => {
    assertKeyCanMutate(principal);
    await prisma.role.delete({ where: { id: params.id } });
    return NextResponse.json({ deleted: true, id: params.id });
  });
}
