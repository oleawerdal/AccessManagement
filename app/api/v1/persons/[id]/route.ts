import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApiV1, assertKeyCanMutate } from "@/lib/api-v1";
import { personUpdateSchema } from "@/lib/validators";
import { serializePerson } from "@/lib/v1/serializers";

type Params = { params: { id: string } };

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: Params) {
  return withApiV1(async () => {
    const person = await prisma.person.findUniqueOrThrow({
      where: { id: params.id },
    });
    return NextResponse.json(serializePerson(person));
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return withApiV1(async (principal) => {
    assertKeyCanMutate(principal);
    const data = personUpdateSchema.parse(await req.json());
    const updated = await prisma.person.update({
      where: { id: params.id },
      data: {
        ...data,
        ...(data.email ? { email: data.email.toLowerCase() } : {}),
      },
    });
    return NextResponse.json(serializePerson(updated));
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withApiV1(async (principal) => {
    assertKeyCanMutate(principal);
    await prisma.person.delete({ where: { id: params.id } });
    return NextResponse.json({ deleted: true, id: params.id });
  });
}
