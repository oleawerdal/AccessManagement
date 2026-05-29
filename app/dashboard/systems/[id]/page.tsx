import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, ExternalLink } from "lucide-react";

import { auth } from "@/lib/auth";
import { getSystemWithAccess } from "@/lib/data";
import { canMutate } from "@/lib/permissions";
import { SystemFormDialog } from "@/components/forms/system-form";
import { RoleFormDialog } from "@/components/forms/role-form";
import { DeleteButton } from "@/components/common/delete-button";
import { SystemAccessTable } from "@/components/tables/system-access-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SystemDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  const isAdmin = canMutate(session?.user.role);
  const system = await getSystemWithAccess(params.id);
  if (!system) notFound();

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard/systems"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Tilbake til systemer
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{system.name}</h1>
            {!system.active && (
              <Badge variant="outline" className="text-muted-foreground">
                Inaktivt
              </Badge>
            )}
            {system.url && (
              <a
                href={system.url}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Åpne system"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
          {system.description && (
            <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
              {system.description}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {system.category ?? "Ukategorisert"}
            {system.ownerPerson
              ? ` · Eier: ${system.ownerPerson.firstName} ${system.ownerPerson.lastName}`
              : system.ownerEmail
                ? ` · Eier: ${system.ownerEmail}`
                : ""}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <RoleFormDialog
              systemId={system.id}
              trigger={<Button size="sm">Ny rolle</Button>}
            />
            <SystemFormDialog
              system={system}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4" /> Rediger
                </Button>
              }
            />
            <DeleteButton
              url={`/api/systems/${system.id}`}
              resourceLabel={system.name}
              redirectTo="/dashboard/systems"
              successMessage="System slettet."
            />
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roller og tilganger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <SystemAccessTable
            systemId={system.id}
            roles={system.roles}
            canMutate={isAdmin}
          />
        </CardContent>
      </Card>
    </div>
  );
}
