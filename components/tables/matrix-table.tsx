"use client";

import { useState } from "react";
import { Check, KeyRound } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type { RiskLevel } from "@prisma/client";

import { cn } from "@/lib/utils";
import {
  expiryStatusClasses,
  expiryStatusLabel,
  type ExpiryStatus,
} from "@/lib/expiry";
import { assignmentSourceLabel } from "@/lib/labels";
import type { MatrixCell, ResourceMatrixCell } from "@/lib/data";
import { RiskBadge } from "@/components/badges/risk-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type RoleCol = { id: string; name: string; riskLevel: RiskLevel };
type SystemCol = { id: string; name: string; roles: RoleCol[] };
type ResourceCol = { id: string; name: string; riskLevel: RiskLevel | null };
type ResourceGroup = { id: string; label: string; resources: ResourceCol[] };
type PersonRow = {
  id: string;
  firstName: string;
  lastName: string;
  department: string | null;
};

type Selected =
  | {
      kind: "role";
      person: PersonRow;
      systemName: string;
      role: RoleCol;
      cell: MatrixCell;
    }
  | {
      kind: "resource";
      person: PersonRow;
      typeLabel: string;
      resource: ResourceCol;
      cell: ResourceMatrixCell;
    };

const dotClass: Record<ExpiryStatus, string> = {
  VALID: "bg-status-valid/15 text-status-valid",
  EXPIRING: "bg-status-expiring/15 text-status-expiring",
  EXPIRED: "bg-status-expired/15 text-status-expired",
};

export function MatrixTable({
  systems,
  persons,
  cells,
  resourceGroups,
  resourceCells,
}: {
  systems: SystemCol[];
  persons: PersonRow[];
  cells: Record<string, Record<string, MatrixCell>>;
  resourceGroups: ResourceGroup[];
  resourceCells: Record<string, Record<string, ResourceMatrixCell>>;
}) {
  const [selected, setSelected] = useState<Selected | null>(null);
  const roleCount = systems.reduce((n, s) => n + s.roles.length, 0);
  const resourceCount = resourceGroups.reduce(
    (n, g) => n + g.resources.length,
    0,
  );
  const hasResources = resourceCount > 0;

  if (persons.length === 0 || roleCount + resourceCount === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm text-muted-foreground">
        Ingen aktive personer, roller eller ressurser å vise.
      </p>
    );
  }

  // Strong divider on the first physical-resource column to set it apart.
  const dividerClass = "border-l-2 border-primary/40";

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 pb-3 text-xs text-muted-foreground">
        {(["VALID", "EXPIRING", "EXPIRED"] as ExpiryStatus[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span
              className={cn("h-2.5 w-2.5 rounded-full", expiryStatusClasses[s].dot)}
            />
            {expiryStatusLabel[s]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5" /> Systemtilgang
        </span>
        {hasResources && (
          <span className="inline-flex items-center gap-1.5 text-primary">
            <KeyRound className="h-3.5 w-3.5" /> Fysisk tilgang
          </span>
        )}
      </div>

      <div className="relative max-h-[70vh] overflow-auto rounded-lg border">
        <table className="border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th
                rowSpan={2}
                className="sticky left-0 top-0 z-30 min-w-[200px] border-b border-r bg-muted/60 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Person
              </th>
              {systems.map((s) => (
                <th
                  key={s.id}
                  colSpan={s.roles.length}
                  className="sticky top-0 z-20 border-b border-l bg-muted/60 px-3 py-2 text-center text-xs font-semibold"
                >
                  {s.name}
                </th>
              ))}
              {resourceGroups.map((g, gi) => (
                <th
                  key={g.id}
                  colSpan={g.resources.length}
                  className={cn(
                    "sticky top-0 z-20 border-b bg-primary/10 px-3 py-2 text-center text-xs font-semibold text-primary",
                    gi === 0 ? dividerClass : "border-l",
                  )}
                >
                  {g.label}
                </th>
              ))}
            </tr>
            <tr>
              {systems.flatMap((s) =>
                s.roles.map((r, i) => (
                  <th
                    key={r.id}
                    className={cn(
                      "sticky top-[37px] z-20 whitespace-nowrap bg-muted/40 px-2 py-2 text-center align-bottom text-xs font-medium",
                      i === 0 && "border-l",
                    )}
                  >
                    <div className="mx-auto max-w-[120px] truncate" title={r.name}>
                      {r.name}
                    </div>
                  </th>
                )),
              )}
              {resourceGroups.flatMap((g, gi) =>
                g.resources.map((r, i) => (
                  <th
                    key={r.id}
                    className={cn(
                      "sticky top-[37px] z-20 whitespace-nowrap bg-primary/5 px-2 py-2 text-center align-bottom text-xs font-medium",
                      gi === 0 && i === 0 ? dividerClass : i === 0 && "border-l",
                    )}
                  >
                    <div className="mx-auto max-w-[120px] truncate" title={r.name}>
                      {r.name}
                    </div>
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {persons.map((p) => (
              <tr key={p.id} className="group">
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-b border-r bg-background px-3 py-1.5 text-left font-normal group-hover:bg-muted/40"
                >
                  <div className="truncate font-medium">
                    {p.lastName}, {p.firstName}
                  </div>
                  {p.department && (
                    <div className="truncate text-xs text-muted-foreground">
                      {p.department}
                    </div>
                  )}
                </th>
                {systems.flatMap((s) =>
                  s.roles.map((r, i) => {
                    const cell = cells[p.id]?.[r.id];
                    return (
                      <td
                        key={r.id}
                        className={cn(
                          "border-b px-2 py-1.5 text-center",
                          i === 0 && "border-l",
                        )}
                      >
                        {cell ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSelected({
                                kind: "role",
                                person: p,
                                systemName: s.name,
                                role: r,
                                cell,
                              })
                            }
                            aria-label={`${p.firstName} ${p.lastName} – ${r.name}: ${expiryStatusLabel[cell.status]}`}
                            className={cn(
                              "mx-auto flex h-6 w-6 items-center justify-center rounded transition-transform hover:scale-110",
                              dotClass[cell.status],
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <span className="text-muted-foreground/20">·</span>
                        )}
                      </td>
                    );
                  }),
                )}
                {resourceGroups.flatMap((g, gi) =>
                  g.resources.map((r, i) => {
                    const cell = resourceCells[p.id]?.[r.id];
                    const isFirst = gi === 0 && i === 0;
                    return (
                      <td
                        key={r.id}
                        className={cn(
                          "border-b px-2 py-1.5 text-center",
                          isFirst ? dividerClass : i === 0 && "border-l",
                        )}
                      >
                        {cell ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSelected({
                                kind: "resource",
                                person: p,
                                typeLabel: g.label,
                                resource: r,
                                cell,
                              })
                            }
                            aria-label={`${p.firstName} ${p.lastName} – ${r.name}: ${expiryStatusLabel[cell.status]}`}
                            className={cn(
                              "mx-auto flex h-6 w-6 items-center justify-center rounded transition-transform hover:scale-110",
                              dotClass[cell.status],
                            )}
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <span className="text-muted-foreground/20">·</span>
                        )}
                      </td>
                    );
                  }),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected.person.firstName} {selected.person.lastName}
                </DialogTitle>
              </DialogHeader>
              <dl className="space-y-3 text-sm">
                {selected.kind === "role" ? (
                  <>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">System / rolle</dt>
                      <dd className="text-right">
                        {selected.systemName} / {selected.role.name}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Risiko</dt>
                      <dd>
                        <RiskBadge level={selected.role.riskLevel} />
                      </dd>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Ressurs</dt>
                      <dd className="text-right">
                        {selected.typeLabel} / {selected.resource.name}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Metode</dt>
                      <dd className="text-right">
                        {selected.cell.methods.join(", ")}
                      </dd>
                    </div>
                    {selected.resource.riskLevel && (
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-muted-foreground">Risiko</dt>
                        <dd>
                          <RiskBadge level={selected.resource.riskLevel} />
                        </dd>
                      </div>
                    )}
                  </>
                )}
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className={expiryStatusClasses[selected.cell.status].text}>
                    {expiryStatusLabel[selected.cell.status]}
                  </dd>
                </div>
                {selected.kind === "role" && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Kilde</dt>
                    <dd>{assignmentSourceLabel[selected.cell.source]}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Tildelt</dt>
                  <dd>
                    {format(new Date(selected.cell.grantedAt), "dd.MM.yyyy", {
                      locale: nb,
                    })}
                    {selected.cell.grantedBy ? ` av ${selected.cell.grantedBy}` : ""}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Utløp</dt>
                  <dd>
                    {selected.cell.expiresAt
                      ? format(new Date(selected.cell.expiresAt), "dd.MM.yyyy", {
                          locale: nb,
                        })
                      : "Permanent"}
                  </dd>
                </div>
                {selected.cell.notes && (
                  <div className="border-t pt-2 text-muted-foreground">
                    {selected.cell.notes}
                  </div>
                )}
              </dl>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
