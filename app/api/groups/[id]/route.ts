import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { groupUpdateSchema } from "@/lib/validators";
import { syncGroupMembers } from "@/lib/services/groups";

type Params = { params: { id: string } };

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: Params) {
  return withApi(async () => {
    const group = await prisma.group.findUniqueOrThrow({
      where: { id: params.id },
      include: {
        groupRoles: {
          include: { role: { include: { system: true } } },
        },
        memberships: {
          include: { person: true },
          orderBy: { addedAt: "desc" },
        },
      },
    });
    return NextResponse.json(group);
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = groupUpdateSchema.parse(await req.json());

    await prisma.group.update({
      where: { id: params.id },
      data: { name: data.name, description: data.description },
    });

    // If a role set is supplied, reconcile group roles then re-sync members.
    if (data.roles) {
      const desiredRoleIds = new Set(data.roles.map((r) => r.roleId));
      const existing = await prisma.groupRole.findMany({
        where: { groupId: params.id },
      });

      for (const gr of existing) {
        if (!desiredRoleIds.has(gr.roleId)) {
          await prisma.groupRole.delete({ where: { id: gr.id } });
        }
      }
      for (const r of data.roles) {
        await prisma.groupRole.upsert({
          where: {
            groupId_roleId: { groupId: params.id, roleId: r.roleId },
          },
          update: { defaultExpiryDays: r.defaultExpiryDays ?? null },
          create: {
            groupId: params.id,
            roleId: r.roleId,
            defaultExpiryDays: r.defaultExpiryDays ?? null,
          },
        });
      }

      await syncGroupMembers(params.id);
    }

    const group = await prisma.group.findUniqueOrThrow({
      where: { id: params.id },
      include: { groupRoles: { include: { role: true } } },
    });
    return NextResponse.json(group);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    await prisma.group.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  });
}
