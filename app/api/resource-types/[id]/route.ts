import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { resourceTypeUpdateSchema } from "@/lib/validators";

type Params = { params: { id: string } };

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = resourceTypeUpdateSchema.parse(await req.json());
    const updated = await prisma.resourceType.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const type = await prisma.resourceType.findUniqueOrThrow({
      where: { id: params.id },
      include: { _count: { select: { resources: true } } },
    });
    if (type._count.resources > 0) {
      return NextResponse.json(
        {
          error: `Typen brukes av ${type._count.resources} ressurs(er) og kan ikke slettes. Flytt ressursene til en annen type først.`,
        },
        { status: 409 },
      );
    }
    try {
      await prisma.resourceType.delete({ where: { id: params.id } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2003"
      ) {
        return NextResponse.json(
          { error: "Typen er i bruk og kan ikke slettes." },
          { status: 409 },
        );
      }
      throw err;
    }
    return NextResponse.json({ ok: true });
  });
}
