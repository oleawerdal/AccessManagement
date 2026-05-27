import { Fragment } from "react";
import type { RiskLevel, AssignmentSource } from "@prisma/client";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

import { assignmentSourceLabel } from "@/lib/labels";
import { RiskBadge } from "@/components/badges/risk-badge";
import { ExpiryIndicator } from "@/components/badges/expiry-indicator";
import { AssignmentActions } from "@/components/assignments/assignment-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AccessRow = {
  id: string;
  source: AssignmentSource;
  expiresAt: Date | null;
  revokedAt: Date | null;
  grantedAt: Date;
  grantedBy: string | null;
  notes: string | null;
  role: { name: string; riskLevel: RiskLevel; system: { name: string } };
};

export function PersonAccessTable({
  assignments,
  canMutate,
}: {
  assignments: AccessRow[];
  canMutate: boolean;
}) {
  if (assignments.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-muted-foreground">
        Ingen tilganger registrert.
      </p>
    );
  }

  // Group by system, keep systems alphabetical.
  const bySystem = new Map<string, AccessRow[]>();
  for (const a of assignments) {
    const key = a.role.system.name;
    if (!bySystem.has(key)) bySystem.set(key, []);
    bySystem.get(key)!.push(a);
  }
  const systems = [...bySystem.keys()].sort((a, b) => a.localeCompare(b, "nb"));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rolle</TableHead>
          <TableHead>Risiko</TableHead>
          <TableHead>Kilde</TableHead>
          <TableHead>Tildelt</TableHead>
          <TableHead>Utløp</TableHead>
          {canMutate && <TableHead className="w-10" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {systems.map((systemName) => (
          <Fragment key={systemName}>
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={canMutate ? 6 : 5}
                className="bg-muted/40 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {systemName}
              </TableCell>
            </TableRow>
            {bySystem
              .get(systemName)!
              .sort((a, b) => a.role.name.localeCompare(b.role.name, "nb"))
              .map((a) => (
                <TableRow key={a.id} className={a.revokedAt ? "opacity-50" : ""}>
                  <TableCell>
                    <div className="font-medium">{a.role.name}</div>
                    {a.notes && (
                      <div className="text-xs text-muted-foreground">{a.notes}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <RiskBadge level={a.role.riskLevel} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {assignmentSourceLabel[a.source]}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(a.grantedAt, "dd.MM.yyyy", { locale: nb })}
                  </TableCell>
                  <TableCell>
                    <ExpiryIndicator
                      expiresAt={a.expiresAt}
                      revokedAt={a.revokedAt}
                    />
                  </TableCell>
                  {canMutate && (
                    <TableCell>
                      {!a.revokedAt && (
                        <AssignmentActions
                          assignment={{
                            id: a.id,
                            expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
                            revokedAt: null,
                          }}
                          showReview
                        />
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}
