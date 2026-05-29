import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { withApiV1, assertKeyCanMutate } from "@/lib/api-v1";
import { personCreateSchema } from "@/lib/validators";
import { serializePerson } from "@/lib/v1/serializers";
import { parsePagination, parseBool, paginated } from "@/lib/v1/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withApiV1(async () => {
    const sp = req.nextUrl.searchParams;
    const pagination = parsePagination(sp);
    const where: Prisma.PersonWhereInput = {};

    const active = parseBool(sp.get("active"));
    if (active !== undefined) where.active = active;

    const q = sp.get("q")?.trim();
    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { employeeId: { contains: q, mode: "insensitive" } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.person.findMany({
        where,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.person.count({ where }),
    ]);

    return paginated(rows.map(serializePerson), total, pagination);
  });
}

export async function POST(req: NextRequest) {
  return withApiV1(async (principal) => {
    assertKeyCanMutate(principal);
    const data = personCreateSchema.parse(await req.json());
    const created = await prisma.person.create({
      data: { ...data, email: data.email.toLowerCase() },
    });
    return NextResponse.json(serializePerson(created), { status: 201 });
  });
}
