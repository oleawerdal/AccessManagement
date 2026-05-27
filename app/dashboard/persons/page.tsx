import Link from "next/link";
import { Prisma } from "@prisma/client";
import { Pencil } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMutate } from "@/lib/permissions";
import { employmentTypeLabel } from "@/lib/labels";
import { PageHeader } from "@/components/layout/page-header";
import { PersonsToolbar } from "@/components/persons/persons-toolbar";
import { PersonFormDialog } from "@/components/forms/person-form";
import { DeleteButton } from "@/components/common/delete-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function PersonsPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    department?: string;
    employmentType?: string;
    active?: string;
  };
}) {
  const session = await auth();
  const isAdmin = canMutate(session?.user.role);

  const where: Prisma.PersonWhereInput = {};
  if (searchParams.q) {
    where.OR = [
      { firstName: { contains: searchParams.q, mode: "insensitive" } },
      { lastName: { contains: searchParams.q, mode: "insensitive" } },
      { email: { contains: searchParams.q, mode: "insensitive" } },
    ];
  }
  if (searchParams.department) where.department = searchParams.department;
  if (searchParams.employmentType)
    where.employmentType =
      searchParams.employmentType as Prisma.PersonWhereInput["employmentType"];
  if (searchParams.active === "true") where.active = true;
  if (searchParams.active === "false") where.active = false;

  const [persons, departmentRows] = await Promise.all([
    prisma.person.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: { _count: { select: { assignments: true } } },
    }),
    prisma.person.findMany({
      where: { department: { not: null } },
      select: { department: true },
      distinct: ["department"],
      orderBy: { department: "asc" },
    }),
  ]);
  const departments = departmentRows
    .map((d) => d.department)
    .filter((d): d is string => Boolean(d));

  return (
    <div className="space-y-5">
      <PageHeader title="Personer" description={`${persons.length} personer`}>
        {isAdmin && <PersonFormDialog />}
      </PageHeader>

      <PersonsToolbar departments={departments} />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Navn</TableHead>
              <TableHead>Avdeling</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Tilganger</TableHead>
              {isAdmin && <TableHead className="w-20" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {persons.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 6 : 5}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Ingen personer funnet.
                </TableCell>
              </TableRow>
            ) : (
              persons.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/persons/${p.id}`}
                      className="font-medium hover:underline"
                    >
                      {p.firstName} {p.lastName}
                    </Link>
                    <div className="text-xs text-muted-foreground">{p.email}</div>
                  </TableCell>
                  <TableCell className="text-sm">{p.department ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {employmentTypeLabel[p.employmentType]}
                  </TableCell>
                  <TableCell>
                    {p.active ? (
                      <Badge variant="secondary">Aktiv</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Inaktiv
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p._count.assignments}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <PersonFormDialog
                          person={p}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              aria-label="Rediger"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DeleteButton
                          url={`/api/persons/${p.id}`}
                          resourceLabel={`${p.firstName} ${p.lastName}`}
                          successMessage="Person slettet."
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
