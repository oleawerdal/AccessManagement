import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { accessMethodUpdateSchema } from "@/lib/validators";

type Params = { params: { id: string } };

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = accessMethodUpdateSchema.parse(await req.json());
    const updated = await prisma.accessMethod.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const method = await prisma.accessMethod.findUniqueOrThrow({
      where: { id: params.id },
      include: { _count: { select: { accesses: true } } },
    });
    if (method._count.accesses > 0) {
      return NextResponse.json(
        {
          error: `Metoden brukes av ${method._count.accesses} tilgang(er) og kan ikke slettes.`,
        },
        { status: 409 },
      );
    }
    try {
      await prisma.accessMethod.delete({ where: { id: params.id } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2003"
      ) {
        return NextResponse.json(
          { error: "Metoden er i bruk og kan ikke slettes." },
          { status: 409 },
        );
      }
      throw err;
    }
    return NextResponse.json({ ok: true });
  });
}
