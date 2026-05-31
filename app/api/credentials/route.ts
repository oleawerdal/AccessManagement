import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { credentialCreateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withApi(async () => {
    const personId = req.nextUrl.searchParams.get("personId") ?? undefined;
    const credentials = await prisma.credential.findMany({
      where: { personId },
      orderBy: [{ active: "desc" }, { identifier: "asc" }],
      include: {
        method: { select: { id: true, label: true } },
        _count: { select: { resourceAccesses: { where: { revokedAt: null } } } },
      },
    });
    return NextResponse.json(credentials);
  });
}

export async function POST(req: NextRequest) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = credentialCreateSchema.parse(await req.json());
    // Idempotent: if the person already has this identifier, return it instead
    // of failing, so it can be created on-the-fly while granting access.
    const existing = await prisma.credential.findUnique({
      where: {
        personId_identifier: {
          personId: data.personId,
          identifier: data.identifier,
        },
      },
    });
    if (existing) return NextResponse.json(existing, { status: 200 });

    const created = await prisma.credential.create({ data });
    return NextResponse.json(created, { status: 201 });
  });
}
