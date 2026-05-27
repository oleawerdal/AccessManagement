import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { withApi } from "@/lib/api";
import { assertCanMutate } from "@/lib/permissions";
import { personCreateSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  return withApi(async () => {
    const sp = req.nextUrl.searchParams;
    const q = sp.get("q")?.trim();
    const department = sp.get("department")?.trim();
    const employmentType = sp.get("employmentType")?.trim();
    const active = sp.get("active");

    const where: Prisma.PersonWhereInput = {};
    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }
    if (department) where.department = department;
    if (employmentType)
      where.employmentType =
        employmentType as Prisma.PersonWhereInput["employmentType"];
    if (active === "true") where.active = true;
    if (active === "false") where.active = false;

    const persons = await prisma.person.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: { _count: { select: { assignments: true } } },
    });
    return NextResponse.json(persons);
  });
}

export async function POST(req: NextRequest) {
  return withApi(async (session) => {
    assertCanMutate(session);
    const data = personCreateSchema.parse(await req.json());
    const created = await prisma.person.create({
      data: { ...data, email: data.email.toLowerCase() },
    });
    return NextResponse.json(created, { status: 201 });
  });
}
