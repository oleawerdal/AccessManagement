import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { adminUserCreateSchema } from "@/lib/validators";

const SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

export async function GET() {
  return withApi(async () => {
    const users = await prisma.adminUser.findMany({
      orderBy: { name: "asc" },
      select: SAFE_SELECT,
    });
    return NextResponse.json(users);
  });
}

export async function POST(req: NextRequest) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = adminUserCreateSchema.parse(await req.json());
    const passwordHash = await bcrypt.hash(data.password, 12);
    const created = await prisma.adminUser.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        role: data.role,
        active: data.active,
        passwordHash,
      },
      select: SAFE_SELECT,
    });
    return NextResponse.json(created, { status: 201 });
  });
}
