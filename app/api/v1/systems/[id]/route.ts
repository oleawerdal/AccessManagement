import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApiV1, assertKeyCanMutate } from "@/lib/api-v1";
import { systemUpdateSchema } from "@/lib/validators";
import { serializeSystem } from "@/lib/v1/serializers";

type Params = { params: { id: string } };

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: Params) {
  return withApiV1(async () => {
    const system = await prisma.system.findUniqueOrThrow({
      where: { id: params.id },
    });
    return NextResponse.json(serializeSystem(system));
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return withApiV1(async (principal) => {
    assertKeyCanMutate(principal);
    const data = systemUpdateSchema.parse(await req.json());
    const updated = await prisma.system.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json(serializeSystem(updated));
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withApiV1(async (principal) => {
    assertKeyCanMutate(principal);
    await prisma.system.delete({ where: { id: params.id } });
    return NextResponse.json({ deleted: true, id: params.id });
  });
}
