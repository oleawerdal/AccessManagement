import Link from "next/link";
import { Pencil } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMutate } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { GroupFormDialog } from "@/components/forms/group-form";
import { DeleteButton } from "@/components/common/delete-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function GroupsPage() {
  const session = await auth();
  const isAdmin = canMutate(session?.user.role);

  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { groupRoles: true, memberships: true } } },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Grupper"
        description="Maler for tilgangssett som tildeles personer."
      >
        {isAdmin && <GroupFormDialog />}
      </PageHeader>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Navn</TableHead>
              <TableHead>Beskrivelse</TableHead>
              <TableHead className="text-right">Roller</TableHead>
              <TableHead className="text-right">Medlemmer</TableHead>
              {isAdmin && <TableHead className="w-20" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 5 : 4}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Ingen grupper ennå.
                </TableCell>
              </TableRow>
            ) : (
              groups.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/groups/${g.id}`}
                      className="font-medium hover:underline"
                    >
                      {g.name}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-md truncate text-sm text-muted-foreground">
                    {g.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {g._count.groupRoles}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {g._count.memberships}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <DeleteButton
                          url={`/api/groups/${g.id}`}
                          resourceLabel={`gruppen ${g.name}`}
                          successMessage="Gruppe slettet."
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
