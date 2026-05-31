import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { resourceAccessCreateSchema } from "@/lib/validators";
import { grantResourceAccess, accessInclude } from "@/lib/services/resource-access";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withApi(async () => {
    const sp = req.nextUrl.searchParams;
    const where: Prisma.ResourceAccessWhereInput = {};
    const personId = sp.get("personId");
    const resourceId = sp.get("resourceId");
    if (personId) where.personId = personId;
    if (resourceId) where.resourceId = resourceId;
    if (sp.get("needsRevision") === "true") {
      where.revokedAt = null;
      where.expiresAt = { lt: new Date() };
    }

    const accesses = await prisma.resourceAccess.findMany({
      where,
      include: accessInclude,
      orderBy: { grantedAt: "desc" },
    });
    return NextResponse.json(accesses);
  });
}

export async function POST(req: NextRequest) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = resourceAccessCreateSchema.parse(await req.json());
    const access = await grantResourceAccess({
      personId: data.personId,
      resourceId: data.resourceId,
      methodId: data.methodId,
      credentialId: data.credentialId,
      expiresAt: data.expiresAt ?? null,
      notes: data.notes,
      grantedBy: session.user.email ?? undefined,
    });
    return NextResponse.json(access, { status: 201 });
  });
}
