import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { nb } from "date-fns/locale";
import {
  Users,
  Server,
  KeyRound,
  AlertTriangle,
  ArrowRight,
  DoorOpen,
  IdCard,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";
import { canMutate } from "@/lib/permissions";
import { daysUntilExpiry } from "@/lib/expiry";
import { auditActionClasses, auditActionLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { RiskBadge } from "@/components/badges/risk-badge";
import { AssignmentActions } from "@/components/assignments/assignment-actions";
import { ResourceAccessActions } from "@/components/resource-access/resource-access-actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: typeof Users;
  tone?: "default" | "danger";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-md",
            tone === "danger"
              ? "bg-status-expired/10 text-status-expired"
              : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-semibold tabular-nums">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const isAdmin = canMutate(session?.user.role);
  const data = await getDashboardData();
  const totalNeedsRevision =
    data.needsRevisionCount + data.resourceNeedsRevisionCount;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Oversikt"
        description="Status for dokumenterte system- og ressurstilganger."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Aktive personer" value={data.personCount} icon={Users} />
        <StatCard label="Systemer" value={data.systemCount} icon={Server} />
        <StatCard label="Ressurser" value={data.resourceCount} icon={DoorOpen} />
        <StatCard
          label="Aktive systemtilganger"
          value={data.activeAssignments}
          icon={KeyRound}
        />
        <StatCard
          label="Aktive fysiske tilganger"
          value={data.resourceAccessCount}
          icon={IdCard}
        />
        <StatCard
          label="Krever revisjon"
          value={totalNeedsRevision}
          icon={AlertTriangle}
          tone={totalNeedsRevision > 0 ? "danger" : "default"}
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-status-expired" />
              Krever revisjon
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Utløpte tilganger som ennå ikke er revokert.
            </p>
          </div>
          {data.expiringSoonCount + data.resourceExpiringSoonCount > 0 && (
            <span className="rounded-md bg-status-expiring/10 px-2 py-1 text-xs font-medium text-status-expiring">
              {data.expiringSoonCount + data.resourceExpiringSoonCount} utløper
              innen 30 dager
            </span>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {data.revisionList.length === 0 &&
          data.resourceRevisionList.length === 0 ? (
            <div className="px-5 pb-6 pt-2 text-sm text-muted-foreground">
              Ingen tilganger krever revisjon nå.
            </div>
          ) : (
            <div className="space-y-1">
              {data.revisionList.length > 0 && (
                <>
                  <div className="px-5 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Systemtilganger
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Person</TableHead>
                        <TableHead>System / rolle</TableHead>
                        <TableHead>Risiko</TableHead>
                        <TableHead>Utløp</TableHead>
                        {isAdmin && <TableHead className="w-10" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.revisionList.map((a) => {
                        const days = daysUntilExpiry(a.expiresAt);
                        return (
                          <TableRow key={a.id}>
                            <TableCell>
                              <Link
                                href={`/dashboard/persons/${a.personId}`}
                                className="font-medium hover:underline"
                              >
                                {a.person.firstName} {a.person.lastName}
                              </Link>
                              <div className="text-xs text-muted-foreground">
                                {a.person.department ?? "—"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {a.role.system.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {a.role.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <RiskBadge level={a.role.riskLevel} />
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-status-expired">
                                {a.expiresAt
                                  ? format(new Date(a.expiresAt), "dd.MM.yyyy", {
                                      locale: nb,
                                    })
                                  : "—"}
                              </span>
                              {days !== null && (
                                <div className="text-xs text-muted-foreground">
                                  {Math.abs(days)} d. siden
                                </div>
                              )}
                            </TableCell>
                            {isAdmin && (
                              <TableCell>
                                <AssignmentActions
                                  assignment={{
                                    id: a.id,
                                    expiresAt: a.expiresAt
                                      ? a.expiresAt.toISOString()
                                      : null,
                                    revokedAt: null,
                                  }}
                                  showReview
                                />
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </>
              )}

              {data.resourceRevisionList.length > 0 && (
                <>
                  <div className="px-5 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Fysiske tilganger
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Person</TableHead>
                        <TableHead>Ressurs / metode</TableHead>
                        <TableHead>Risiko</TableHead>
                        <TableHead>Utløp</TableHead>
                        {isAdmin && <TableHead className="w-10" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.resourceRevisionList.map((a) => {
                        const days = daysUntilExpiry(a.expiresAt);
                        return (
                          <TableRow key={a.id}>
                            <TableCell>
                              <Link
                                href={`/dashboard/persons/${a.personId}`}
                                className="font-medium hover:underline"
                              >
                                {a.person.firstName} {a.person.lastName}
                              </Link>
                              <div className="text-xs text-muted-foreground">
                                {a.person.department ?? "—"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Link
                                href={`/dashboard/resources/${a.resourceId}`}
                                className="font-medium hover:underline"
                              >
                                {a.resource.name}
                              </Link>
                              <div className="text-xs text-muted-foreground">
                                {a.resource.type.label} · {a.method.label}
                              </div>
                            </TableCell>
                            <TableCell>
                              {a.resource.riskLevel ? (
                                <RiskBadge level={a.resource.riskLevel} />
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-status-expired">
                                {a.expiresAt
                                  ? format(new Date(a.expiresAt), "dd.MM.yyyy", {
                                      locale: nb,
                                    })
                                  : "—"}
                              </span>
                              {days !== null && (
                                <div className="text-xs text-muted-foreground">
                                  {Math.abs(days)} d. siden
                                </div>
                              )}
                            </TableCell>
                            {isAdmin && (
                              <TableCell>
                                <ResourceAccessActions
                                  access={{
                                    id: a.id,
                                    expiresAt: a.expiresAt
                                      ? a.expiresAt.toISOString()
                                      : null,
                                    revokedAt: null,
                                    hasCredential: Boolean(
                                      a.method.requiresCredential ||
                                        a.credentialId,
                                    ),
                                    credentialReturned: a.credentialReturned,
                                  }}
                                />
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Nylig aktivitet</CardTitle>
          <Link
            href="/dashboard/audit"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Hele loggen <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-1">
          {data.recentAudit.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen aktivitet ennå.</p>
          ) : (
            data.recentAudit.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 border-b py-2 text-sm last:border-0"
              >
                <span
                  className={cn(
                    "inline-flex w-28 shrink-0 items-center justify-center rounded-md border px-1.5 py-0.5 text-xs font-medium",
                    auditActionClasses[log.action],
                  )}
                >
                  {auditActionLabel[log.action]}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {log.entityLabel ?? log.entityType}
                </span>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {log.adminEmail}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(log.timestamp), {
                    addSuffix: true,
                    locale: nb,
                  })}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
