import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { riskLevelCreateSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

// Readable by any authenticated user (badges/dropdowns); only ADMIN may mutate.
export async function GET() {
  return withApi(async () => {
    const levels = await prisma.riskLevel.findMany({
      orderBy: [{ severity: "asc" }, { label: "asc" }],
    });
    return NextResponse.json(levels);
  });
}

export async function POST(req: NextRequest) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = riskLevelCreateSchema.parse(await req.json());
    const created = await prisma.riskLevel.create({ data });
    await writeAuditLog({
      action: "CREATE",
      entityType: "RiskLevel",
      entityId: created.id,
      entityLabel: created.label,
      after: { label: created.label, color: created.color, severity: created.severity },
    });
    return NextResponse.json(created, { status: 201 });
  });
}
