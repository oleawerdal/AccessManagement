import Link from "next/link";
import type { RiskLevel, AssignmentSource } from "@prisma/client";
import { Pencil } from "lucide-react";
// RiskLevel is now a model; we use its label/color/description for the badge.

import { assignmentSourceLabel } from "@/lib/labels";
import { RiskBadge } from "@/components/badges/risk-badge";
import { ExpiryIndicator } from "@/components/badges/expiry-indicator";
import { RoleFormDialog } from "@/components/forms/role-form";
import { DeleteButton } from "@/components/common/delete-button";
import { Button } from "@/components/ui/button";

type RoleWithPeople = {
  id: string;
  name: string;
  description: string | null;
  riskLevelId: string;
  riskLevel: RiskLevel;
  systemId: string;
  createdAt: Date;
  updatedAt: Date;
  assignments: {
    id: string;
    source: AssignmentSource;
    expiresAt: Date | null;
    revokedAt: Date | null;
    person: { id: string; firstName: string; lastName: string };
  }[];
};

export function SystemAccessTable({
  systemId,
  roles,
  canMutate,
}: {
  systemId: string;
  roles: RoleWithPeople[];
  canMutate: boolean;
}) {
  if (roles.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-muted-foreground">
        Ingen roller definert for dette systemet ennå.
      </p>
    );
  }

  return (
    <div className="divide-y">
      {roles.map((role) => (
        <div key={role.id} className="px-5 py-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">{role.name}</span>
              <RiskBadge level={role.riskLevel} />
              <span className="text-xs text-muted-foreground">
                {role.assignments.length} personer
              </span>
            </div>
            {canMutate && (
              <div className="flex items-center gap-1">
                <RoleFormDialog
                  systemId={systemId}
                  role={role}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Rediger rolle"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  }
                />
                <DeleteButton
                  url={`/api/roles/${role.id}`}
                  resourceLabel={`rollen ${role.name}`}
                  successMessage="Rolle slettet."
                />
              </div>
            )}
          </div>
          {role.assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen tildelinger.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {role.assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <Link
                    href={`/dashboard/persons/${a.person.id}`}
                    className="hover:underline"
                  >
                    {a.person.firstName} {a.person.lastName}
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {assignmentSourceLabel[a.source]}
                    </span>
                    <ExpiryIndicator
                      expiresAt={a.expiresAt}
                      revokedAt={a.revokedAt}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
