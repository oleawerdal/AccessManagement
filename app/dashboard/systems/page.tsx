import Link from "next/link";
import { Pencil, ExternalLink } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMutate } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { SystemFormDialog } from "@/components/forms/system-form";
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

export default async function SystemsPage() {
  const session = await auth();
  const isAdmin = canMutate(session?.user.role);

  const systems = await prisma.system.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { roles: true } } },
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Systemer" description={`${systems.length} systemer`}>
        {isAdmin && <SystemFormDialog />}
      </PageHeader>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Navn</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Systemeier</TableHead>
              <TableHead className="text-right">Roller</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="w-20" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {systems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 6 : 5}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Ingen systemer ennå.
                </TableCell>
              </TableRow>
            ) : (
              systems.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/systems/${s.id}`}
                      className="font-medium hover:underline"
                    >
                      {s.name}
                    </Link>
                    {s.url && (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-1.5 inline-flex text-muted-foreground hover:text-foreground"
                        aria-label="Åpne system"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{s.category ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.ownerEmail ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s._count.roles}
                  </TableCell>
                  <TableCell>
                    {s.active ? (
                      <Badge variant="secondary">Aktivt</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Inaktivt
                      </Badge>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <SystemFormDialog
                          system={s}
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
                          url={`/api/systems/${s.id}`}
                          resourceLabel={s.name}
                          successMessage="System slettet."
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
