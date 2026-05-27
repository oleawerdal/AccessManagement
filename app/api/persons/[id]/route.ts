import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { personUpdateSchema } from "@/lib/validators";

type Params = { params: { id: string } };

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: Params) {
  return withApi(async () => {
    const person = await prisma.person.findUniqueOrThrow({
      where: { id: params.id },
      include: {
        assignments: {
          include: { role: { include: { system: true } } },
          orderBy: { grantedAt: "desc" },
        },
        memberships: { include: { group: true } },
      },
    });
    return NextResponse.json(person);
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = personUpdateSchema.parse(await req.json());
    const updated = await prisma.person.update({
      where: { id: params.id },
      data: {
        ...data,
        ...(data.email ? { email: data.email.toLowerCase() } : {}),
      },
    });
    return NextResponse.json(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    await prisma.person.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  });
}
