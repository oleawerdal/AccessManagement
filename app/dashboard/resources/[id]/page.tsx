import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import { auth } from "@/lib/auth";
import { getResourceWithAccess } from "@/lib/data";
import { canMutate } from "@/lib/permissions";
import { ResourceFormDialog } from "@/components/forms/resource-form";
import { ResourceAccessFormDialog } from "@/components/forms/resource-access-form";
import { DeleteButton } from "@/components/common/delete-button";
import { RiskBadge } from "@/components/badges/risk-badge";
import {
  ResourceAccessTable,
  type ResourceAccessRow,
} from "@/components/tables/resource-access-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ResourceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  const isAdmin = canMutate(session?.user.role);
  const resource = await getResourceWithAccess(params.id);
  if (!resource) notFound();

  const rows: ResourceAccessRow[] = resource.accesses.map((a) => ({
    id: a.id,
    expiresAt: a.expiresAt,
    revokedAt: a.revokedAt,
    grantedAt: a.grantedAt,
    credentialId: a.credentialId,
    credentialReturned: a.credentialReturned,
    notes: a.notes,
    method: a.method,
    person: a.person,
  }));

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard/resources"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Tilbake til ressurser
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">
              {resource.name}
            </h1>
            <Badge variant="secondary">{resource.type.label}</Badge>
            {resource.riskLevel && <RiskBadge level={resource.riskLevel} />}
            {!resource.active && (
              <Badge variant="outline" className="text-muted-foreground">
                Inaktiv
              </Badge>
            )}
          </div>
          {resource.description && (
            <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
              {resource.description}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {resource.location ?? "Uten plassering"}
            {resource.identifier ? ` · ${resource.identifier}` : ""}
            {resource.ownerPerson
              ? ` · Ansvarlig: ${resource.ownerPerson.firstName} ${resource.ownerPerson.lastName}`
              : ""}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <ResourceAccessFormDialog
              resourceId={resource.id}
              trigger={<Button size="sm">Gi tilgang</Button>}
            />
            <ResourceFormDialog
              resource={resource}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4" /> Rediger
                </Button>
              }
            />
            <DeleteButton
              url={`/api/resources/${resource.id}`}
              resourceLabel={resource.name}
              redirectTo="/dashboard/resources"
              successMessage="Ressurs slettet."
            />
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tilganger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ResourceAccessTable accesses={rows} column="person" canMutate={isAdmin} />
        </CardContent>
      </Card>
    </div>
  );
}
