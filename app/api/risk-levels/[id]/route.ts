import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { riskLevelUpdateSchema } from "@/lib/validators";

type Params = { params: { id: string } };

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = riskLevelUpdateSchema.parse(await req.json());
    const updated = await prisma.riskLevel.update({
      where: { id: params.id },
      data,
    });
    await writeAuditLog({
      action: "UPDATE",
      entityType: "RiskLevel",
      entityId: updated.id,
      entityLabel: updated.label,
      after: { label: updated.label, color: updated.color, severity: updated.severity },
    });
    return NextResponse.json(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const level = await prisma.riskLevel.findUniqueOrThrow({
      where: { id: params.id },
      include: { _count: { select: { roles: true } } },
    });
    if (level._count.roles > 0) {
      return NextResponse.json(
        {
          error: `Nivået brukes av ${level._count.roles} rolle(r) og kan ikke slettes. Flytt rollene til et annet nivå først.`,
        },
        { status: 409 },
      );
    }
    try {
      await prisma.riskLevel.delete({ where: { id: params.id } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2003"
      ) {
        return NextResponse.json(
          { error: "Nivået er i bruk og kan ikke slettes." },
          { status: 409 },
        );
      }
      throw err;
    }
    await writeAuditLog({
      action: "DELETE",
      entityType: "RiskLevel",
      entityId: level.id,
      entityLabel: level.label,
      before: { label: level.label, color: level.color, severity: level.severity },
    });
    return NextResponse.json({ ok: true });
  });
}
