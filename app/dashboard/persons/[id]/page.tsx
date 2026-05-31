import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { ArrowLeft, Pencil } from "lucide-react";

import { auth } from "@/lib/auth";
import { getPersonWithAccess } from "@/lib/data";
import { canMutate } from "@/lib/permissions";
import { employmentTypeLabel } from "@/lib/labels";
import { PersonFormDialog } from "@/components/forms/person-form";
import { AssignmentFormDialog } from "@/components/forms/assignment-form";
import { ResourceAccessFormDialog } from "@/components/forms/resource-access-form";
import { DeleteButton } from "@/components/common/delete-button";
import { PersonGroups } from "@/components/persons/person-groups";
import { PersonAccessTable } from "@/components/tables/person-access-table";
import {
  ResourceAccessTable,
  type ResourceAccessRow,
} from "@/components/tables/resource-access-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || "—"}</dd>
    </div>
  );
}

export default async function PersonDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  const isAdmin = canMutate(session?.user.role);
  const person = await getPersonWithAccess(params.id);
  if (!person) notFound();

  const resourceRows: ResourceAccessRow[] = person.resourceAccesses.map((a) => ({
    id: a.id,
    expiresAt: a.expiresAt,
    revokedAt: a.revokedAt,
    grantedAt: a.grantedAt,
    credentialId: a.credentialId,
    credentialReturned: a.credentialReturned,
    notes: a.notes,
    method: a.method,
    resource: a.resource,
  }));

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard/persons"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Tilbake til personer
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">
              {person.firstName} {person.lastName}
            </h1>
            {person.active ? (
              <Badge variant="secondary">Aktiv</Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Inaktiv
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{person.email}</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <PersonFormDialog
              person={person}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4" /> Rediger
                </Button>
              }
            />
            <DeleteButton
              url={`/api/persons/${person.id}`}
              resourceLabel={`${person.firstName} ${person.lastName}`}
              redirectTo="/dashboard/persons"
              successMessage="Person slettet."
            />
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Detaljer</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Ansatt-ID" value={person.employeeId} />
              <Field
                label="Type"
                value={employmentTypeLabel[person.employmentType]}
              />
              <Field label="Avdeling" value={person.department} />
              <Field label="Stilling" value={person.jobTitle} />
              <Field
                label="Startdato"
                value={
                  person.startDate
                    ? format(person.startDate, "dd.MM.yyyy", { locale: nb })
                    : null
                }
              />
              <Field
                label="Sluttdato"
                value={
                  person.endDate
                    ? format(person.endDate, "dd.MM.yyyy", { locale: nb })
                    : null
                }
              />
              <div className="col-span-2">
                <Field label="Notater" value={person.notes} />
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Grupper</CardTitle>
          </CardHeader>
          <CardContent>
            <PersonGroups
              personId={person.id}
              memberships={person.memberships}
              canMutate={isAdmin}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Tilganger</CardTitle>
          {isAdmin && <AssignmentFormDialog personId={person.id} />}
        </CardHeader>
        <CardContent className="p-0">
          <PersonAccessTable assignments={person.assignments} canMutate={isAdmin} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Fysiske tilganger</CardTitle>
          {isAdmin && <ResourceAccessFormDialog personId={person.id} />}
        </CardHeader>
        <CardContent className="p-0">
          <ResourceAccessTable
            accesses={resourceRows}
            column="resource"
            canMutate={isAdmin}
          />
        </CardContent>
      </Card>
    </div>
  );
}
