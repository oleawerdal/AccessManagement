import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMutate } from "@/lib/permissions";
import { GroupFormDialog } from "@/components/forms/group-form";
import { DeleteButton } from "@/components/common/delete-button";
import { GroupMembers } from "@/components/groups/group-members";
import { RiskBadge } from "@/components/badges/risk-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function GroupDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  const isAdmin = canMutate(session?.user.role);

  const group = await prisma.group.findUnique({
    where: { id: params.id },
    include: {
      groupRoles: { include: { role: { include: { system: true } } } },
      memberships: { include: { person: true }, orderBy: { addedAt: "desc" } },
    },
  });
  if (!group) notFound();

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard/groups"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Tilbake til grupper
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{group.name}</h1>
          {group.description && (
            <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
              {group.description}
            </p>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <GroupFormDialog
              group={group}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4" /> Rediger
                </Button>
              }
            />
            <DeleteButton
              url={`/api/groups/${group.id}`}
              resourceLabel={`gruppen ${group.name}`}
              redirectTo="/dashboard/groups"
              successMessage="Gruppe slettet."
            />
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Roller i gruppen</CardTitle>
          </CardHeader>
          <CardContent>
            {group.groupRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ingen roller i gruppen.
              </p>
            ) : (
              <ul className="divide-y">
                {group.groupRoles.map((gr) => (
                  <li
                    key={gr.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <div className="text-sm font-medium">{gr.role.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {gr.role.system.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {gr.defaultExpiryDays
                          ? `${gr.defaultExpiryDays} dager`
                          : "Permanent"}
                      </span>
                      <RiskBadge level={gr.role.riskLevel} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Medlemmer ({group.memberships.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GroupMembers
              groupId={group.id}
              members={group.memberships}
              canMutate={isAdmin}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
