import type { RiskLevel } from "@prisma/client";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { RiskBadge } from "@/components/badges/risk-badge";
import { ExpiryIndicator } from "@/components/badges/expiry-indicator";
import { ResourceAccessActions } from "@/components/resource-access/resource-access-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ResourceAccessRow = {
  id: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  grantedAt: Date;
  credentialId: string | null;
  credentialReturned: boolean;
  notes: string | null;
  method: { label: string; requiresCredential: boolean };
  person?: { firstName: string; lastName: string } | null;
  resource?: {
    name: string;
    type: { label: string };
    riskLevel: RiskLevel | null;
  } | null;
};

export function ResourceAccessTable({
  accesses,
  column,
  canMutate,
}: {
  accesses: ResourceAccessRow[];
  /** Which entity column to show: the person or the resource. */
  column: "person" | "resource";
  canMutate: boolean;
}) {
  if (accesses.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-muted-foreground">
        Ingen fysiske tilganger registrert.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{column === "person" ? "Person" : "Ressurs"}</TableHead>
          <TableHead>Metode</TableHead>
          <TableHead>Kort/nøkkel</TableHead>
          <TableHead>Tildelt</TableHead>
          <TableHead>Utløp</TableHead>
          {canMutate && <TableHead className="w-10" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {accesses.map((a) => (
          <TableRow key={a.id} className={a.revokedAt ? "opacity-50" : ""}>
            <TableCell>
              {column === "person" ? (
                <div className="font-medium">
                  {a.person ? `${a.person.firstName} ${a.person.lastName}` : "—"}
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.resource?.name ?? "—"}</span>
                    {a.resource?.riskLevel && (
                      <RiskBadge level={a.resource.riskLevel} />
                    )}
                  </div>
                  {a.resource?.type && (
                    <div className="text-xs text-muted-foreground">
                      {a.resource.type.label}
                    </div>
                  )}
                </div>
              )}
              {a.notes && (
                <div className="text-xs text-muted-foreground">{a.notes}</div>
              )}
            </TableCell>
            <TableCell className="text-sm">{a.method.label}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {a.credentialId ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-mono text-xs">{a.credentialId}</span>
                  {a.revokedAt &&
                    (a.credentialReturned ? (
                      <Badge variant="secondary">Innlevert</Badge>
                    ) : (
                      <Badge variant="outline" className="text-status-expired">
                        Ikke innlevert
                      </Badge>
                    ))}
                </span>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {format(a.grantedAt, "dd.MM.yyyy", { locale: nb })}
            </TableCell>
            <TableCell>
              <ExpiryIndicator expiresAt={a.expiresAt} revokedAt={a.revokedAt} />
            </TableCell>
            {canMutate && (
              <TableCell>
                {!a.revokedAt && (
                  <ResourceAccessActions
                    access={{
                      id: a.id,
                      expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
                      revokedAt: null,
                      hasCredential: Boolean(
                        a.method.requiresCredential || a.credentialId,
                      ),
                      credentialReturned: a.credentialReturned,
                    }}
                  />
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
