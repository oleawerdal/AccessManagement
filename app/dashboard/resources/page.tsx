import Link from "next/link";
import { Pencil } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMutate } from "@/lib/permissions";
import { PageHeader } from "@/components/layout/page-header";
import { ResourceFormDialog } from "@/components/forms/resource-form";
import { RiskBadge } from "@/components/badges/risk-badge";
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

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const session = await auth();
  const isAdmin = canMutate(session?.user.role);

  const resources = await prisma.resource.findMany({
    orderBy: { name: "asc" },
    include: {
      type: true,
      riskLevel: true,
      ownerPerson: { select: { firstName: true, lastName: true } },
      _count: { select: { accesses: { where: { revokedAt: null } } } },
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ressurser"
        description={`${resources.length} fysiske ressurser (dører, porter, biler m.m.)`}
      >
        {isAdmin && <ResourceFormDialog />}
      </PageHeader>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Navn</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Plassering</TableHead>
              <TableHead>Risiko</TableHead>
              <TableHead className="text-right">Tilganger</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="w-20" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {resources.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 7 : 6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Ingen ressurser ennå.
                </TableCell>
              </TableRow>
            ) : (
              resources.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/resources/${r.id}`}
                      className="font-medium hover:underline"
                    >
                      {r.name}
                    </Link>
                    {r.identifier && (
                      <div className="text-xs text-muted-foreground">
                        {r.identifier}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{r.type.label}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.location ?? "—"}
                  </TableCell>
                  <TableCell>
                    {r.riskLevel ? <RiskBadge level={r.riskLevel} /> : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r._count.accesses}
                  </TableCell>
                  <TableCell>
                    {r.active ? (
                      <Badge variant="secondary">Aktiv</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Inaktiv
                      </Badge>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <ResourceFormDialog
                          resource={r}
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
                          url={`/api/resources/${r.id}`}
                          resourceLabel={r.name}
                          successMessage="Ressurs slettet."
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
