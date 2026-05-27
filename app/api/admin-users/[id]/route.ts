import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { adminUserUpdateSchema } from "@/lib/validators";

type Params = { params: { id: string } };

const SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

export async function PATCH(req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = adminUserUpdateSchema.parse(await req.json());

    const update: Prisma.AdminUserUpdateInput = {
      name: data.name,
      role: data.role,
      active: data.active,
    };
    if (data.password) {
      update.passwordHash = await bcrypt.hash(data.password, 12);
    }

    const updated = await prisma.adminUser.update({
      where: { id: params.id },
      data: update,
      select: SAFE_SELECT,
    });
    return NextResponse.json(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withApi(async (session) => {
    assertCanMutate(session);
    if (session.user.id === params.id) {
      return NextResponse.json(
        { error: "Du kan ikke slette din egen konto." },
        { status: 400 },
      );
    }
    await prisma.adminUser.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  });
}
