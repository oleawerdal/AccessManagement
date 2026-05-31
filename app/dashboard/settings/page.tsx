import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Pencil, ShieldAlert, FileText } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canMutate } from "@/lib/permissions";
import { adminRoleLabel } from "@/lib/labels";
import { PageHeader } from "@/components/layout/page-header";
import { AdminUserFormDialog } from "@/components/forms/admin-user-form";
import { ApiKeyFormDialog } from "@/components/forms/api-key-form";
import { SmtpSettingsForm } from "@/components/forms/smtp-settings-form";
import { SsoSettingsForm } from "@/components/forms/sso-settings-form";
import { RiskLevelsManager } from "@/components/forms/risk-levels-manager";
import { ResourceTypesManager } from "@/components/forms/resource-types-manager";
import { AccessMethodsManager } from "@/components/forms/access-methods-manager";
import { SendPasswordLinkButton } from "@/components/settings/send-password-link-button";
import { DeleteButton } from "@/components/common/delete-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const apiKeys = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      role: true,
      active: true,
      expiresAt: true,
      lastUsedAt: true,
      createdAt: true,
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
                    <SendPasswordLinkButton userId={u.id} />
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

      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="text-base font-semibold">API-nøkler</h2>
          <p className="text-sm text-muted-foreground">
            For eksterne integrasjoner mot REST-API-et (<code>/api/v1</code>).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/v1/docs"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <FileText className="h-4 w-4" /> API-dokumentasjon
          </a>
          <ApiKeyFormDialog />
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Navn</TableHead>
              <TableHead>Identifikator</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Utløper</TableHead>
              <TableHead>Sist brukt</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeys.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Ingen API-nøkler ennå.
                </TableCell>
              </TableRow>
            ) : (
              apiKeys.map((k) => {
                const expired =
                  k.expiresAt != null && k.expiresAt.getTime() <= Date.now();
                return (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {k.prefix}…
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={k.role === "ADMIN" ? "default" : "secondary"}
                      >
                        {adminRoleLabel[k.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!k.active ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          Deaktivert
                        </Badge>
                      ) : expired ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          Utløpt
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Aktiv</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {k.expiresAt
                        ? format(k.expiresAt, "dd.MM.yyyy", { locale: nb })
                        : "Aldri"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {k.lastUsedAt
                        ? format(k.lastUsedAt, "dd.MM.yyyy HH:mm", { locale: nb })
                        : "Aldri"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <ApiKeyFormDialog
                          apiKey={{
                            id: k.id,
                            name: k.name,
                            prefix: k.prefix,
                            role: k.role,
                            active: k.active,
                            expiresAt: k.expiresAt
                              ? k.expiresAt.toISOString()
                              : null,
                          }}
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
                        <DeleteButton
                          url={`/api/admin-keys/${k.id}`}
                          resourceLabel={`API-nøkkelen ${k.name}`}
                          successMessage="API-nøkkel slettet."
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="pt-2">
        <h2 className="text-base font-semibold">E-post (SMTP)</h2>
        <p className="text-sm text-muted-foreground">
          Brukes til utløpsvarsler og passord-lenker. F.eks. SMTP2GO.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Utgående e-post</CardTitle>
        </CardHeader>
        <CardContent>
          <SmtpSettingsForm />
        </CardContent>
      </Card>

      <div className="pt-2">
        <h2 className="text-base font-semibold">Risikonivåer</h2>
        <p className="text-sm text-muted-foreground">
          Nivåene som kan velges på roller. Endre navn, farge, rang og
          beskrivelse.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <RiskLevelsManager />
        </CardContent>
      </Card>

      <div className="pt-2">
        <h2 className="text-base font-semibold">Ressurstyper</h2>
        <p className="text-sm text-muted-foreground">
          Typer fysiske ressurser som kan registreres (dør, port, bil m.m.).
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <ResourceTypesManager />
        </CardContent>
      </Card>

      <div className="pt-2">
        <h2 className="text-base font-semibold">Tilgangsmetoder</h2>
        <p className="text-sm text-muted-foreground">
          Hvordan tilgang gis (fysisk nøkkel, app, nøkkelkort m.m.). Marker
          metoder som utleverer et fysisk kort/nøkkel for å spore ID-en.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <AccessMethodsManager />
        </CardContent>
      </Card>

      <div className="pt-2">
        <h2 className="text-base font-semibold">Single sign-on (SSO)</h2>
        <p className="text-sm text-muted-foreground">
          Innlogging med Microsoft Entra ID.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Microsoft Entra ID</CardTitle>
        </CardHeader>
        <CardContent>
          <SsoSettingsForm />
        </CardContent>
      </Card>
    </div>
  );
}
