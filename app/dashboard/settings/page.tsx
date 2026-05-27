import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Pencil, ShieldAlert } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMutate } from "@/lib/permissions";
import { adminRoleLabel } from "@/lib/labels";
import { PageHeader } from "@/components/layout/page-header";
import { AdminUserFormDialog } from "@/components/forms/admin-user-form";
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

export default async function SettingsPage() {
  const session = await auth();
  // AUDITOR has no access to admin-user management — deny in place (the API
  // enforces this too; the sidebar already hides this item for auditors).
  if (!canMutate(session?.user.role)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold">Ingen tilgang</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Bare administratorer har tilgang til brukerinnstillinger. Du er logget
          inn som revisor (lesetilgang).
        </p>
      </div>
    );
  }

  const users = await prisma.adminUser.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      lastLoginAt: true,
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Innstillinger"
        description="Adminbrukere og tilgang til verktøyet."
      >
        <AdminUserFormDialog />
      </PageHeader>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Navn</TableHead>
              <TableHead>E-post</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sist innlogget</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {u.email}
                </TableCell>
                <TableCell>
                  <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                    {adminRoleLabel[u.role]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {u.active ? (
                    <Badge variant="secondary">Aktiv</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Deaktivert
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {u.lastLoginAt
                    ? format(u.lastLoginAt, "dd.MM.yyyy HH:mm", { locale: nb })
                    : "Aldri"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <AdminUserFormDialog
                      user={u}
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
                    {u.id !== session!.user.id && (
                      <DeleteButton
                        url={`/api/admin-users/${u.id}`}
                        resourceLabel={u.name}
                        successMessage="Adminbruker slettet."
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
