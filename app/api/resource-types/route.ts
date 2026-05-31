import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { resourceTypeCreateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

// Readable by any authenticated user (dropdowns); only ADMIN may mutate.
export async function GET() {
  return withApi(async () => {
    const types = await prisma.resourceType.findMany({
      orderBy: { label: "asc" },
      include: { _count: { select: { resources: true } } },
    });
    return NextResponse.json(types);
  });
}

export async function POST(req: NextRequest) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = resourceTypeCreateSchema.parse(await req.json());
    const created = await prisma.resourceType.create({ data });
    return NextResponse.json(created, { status: 201 });
  });
}
