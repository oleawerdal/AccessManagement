import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { accessMethodCreateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

// Readable by any authenticated user (dropdowns); only ADMIN may mutate.
export async function GET() {
  return withApi(async () => {
    const methods = await prisma.accessMethod.findMany({
      orderBy: { label: "asc" },
      include: { _count: { select: { accesses: true } } },
    });
    return NextResponse.json(methods);
  });
}

export async function POST(req: NextRequest) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = accessMethodCreateSchema.parse(await req.json());
    const created = await prisma.accessMethod.create({ data });
    return NextResponse.json(created, { status: 201 });
  });
}
