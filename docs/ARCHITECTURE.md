# Arkitektur

Dette dokumentet beskriver datamodellen og audit-strategien i Tilgangsstyring.

## Oversikt

Tilgangsstyring er en Next.js 14-applikasjon (App Router) med PostgreSQL via
Prisma. Server-komponenter henter data direkte via Prisma; klient-komponenter
muterer via JSON API-ruter under `app/api/*`. Autentisering håndteres av
NextAuth (Auth.js v5) med JWT-sesjoner.

```
Nettleser ──▶ Server Components (les)  ──▶ Prisma ──▶ PostgreSQL
          └─▶ Client Components ──▶ /api/* (skriv) ──▶ Prisma (+ audit) ──▶ PostgreSQL
```

## Datamodell

Alle modeller er definert i `prisma/schema.prisma`.

### Kjernemodeller

- **AdminUser** – innloggbare brukere. `role` er `ADMIN` eller `AUDITOR`.
  `passwordHash` (bcrypt, cost 12) eksponeres aldri til klienten.
- **Person** – en person som kan ha tilganger. Unik `email`, valgfri unik
  `employeeId`. Indeksert på `(lastName, firstName)` og `active`.
- **System** – et internt system (unikt `name`). Har mange `Role`.
- **Role** – en rolle i et system. Unik per system: `@@unique([systemId, name])`.
  `riskLevel` ∈ `LOW | NORMAL | HIGH | CRITICAL`.
- **Group** – en mal for et tilgangssett.
- **GroupRole** – kobler en `Group` til en `Role` med valgfri
  `defaultExpiryDays`. Unik: `@@unique([groupId, roleId])`.
- **GroupMembership** – kobler en `Person` til en `Group`. Unik:
  `@@unique([personId, groupId])`.
- **RoleAssignment** – selve tilordningen av en rolle til en person.
- **AuditLog** – uforanderlig hendelseslogg.

### RoleAssignment

En tilordning har `source` (`DIRECT` eller `GROUP`), `grantedAt/grantedBy`,
valgfri `expiresAt`, og `revokedAt/revokedBy/revokeReason`.

- Unik: `@@unique([personId, roleId, source])` – samme rolle kan ikke tildeles
  samme person to ganger via samme kilde.
- Indeksert på `expiresAt` og `revokedAt` (for utløps-/revisjonsspørringer).
- **Aktiv** = `revokedAt == null` OG (`expiresAt == null` ELLER `expiresAt > nå`).
  Logikken finnes i `lib/expiry.ts` (`isAssignmentActive`, `getExpiryStatus`,
  `needsRevision`).

### Gruppelogikk

`lib/services/groups.ts` håndterer at tilordninger materialiseres fra grupper:

- **Legg til medlem** → oppretter `GroupMembership` og en `RoleAssignment`
  (`source = GROUP`, `sourceGroupId = gruppe`) for hver rolle i gruppen, med
  utløp basert på `defaultExpiryDays`.
- **Fjern medlem** → sletter medlemskapet og fjerner gruppe-arvede tilordninger
  (`source = GROUP` fra denne gruppen). Direkte­tildelte (`DIRECT`) beholdes.
- **Endre gruppens roller** → `syncGroupMembers` avstemmer alle medlemmers
  gruppe-tilordninger mot gruppens nye rollesett.

## Audit-strategi

Kravet er at all mutasjon logges, og at loggen ikke kan endres eller slettes.

### To Prisma-klienter

`lib/prisma.ts` eksporterer `prisma` – en `PrismaClient` utvidet med
**audit-extension** (`lib/audit.ts`). Audit-loggene skrives av en **separat,
ikke-utvidet klient** (`auditWriter` i `lib/audit.ts`). Dette garanterer at det
å skrive en logg aldri kan trigge audit-extensionen på nytt (ingen rekursjon).

### Automatisk logging (CRUD)

Audit-extensionen bruker `query.$allModels.$allOperations` og logger
`CREATE`/`UPDATE`/`DELETE` for innholds­modellene (`Person`, `System`, `Role`,
`Group`, `GroupRole`, `GroupMembership`, `AdminUser`). Ved `update`/`delete`/
`upsert` hentes «før»-tilstanden først, slik at loggen får både `before` og
`after`.

Extensionen logger kun når det finnes en **audit-kontekst** for forespørselen
(se under). Da vet vi alltid hvem som utførte handlingen.

### Request-kontekst (AsyncLocalStorage)

`lib/audit-context.ts` bruker `AsyncLocalStorage` til å bære
`{ adminUserId, adminEmail, ipAddress, userAgent }` gjennom en forespørsel.
`withApi` (`lib/api.ts`) leser sesjonen, bygger konteksten fra
`session` + request-headers, og kjører handleren inne i
`runWithAuditContext(...)`.

### Eksplisitte hendelser

Handlinger som ikke er ren CRUD logges med eksplisitte hjelpere i `lib/audit.ts`:

- `GRANT` / `REVOKE` – tilordninger (RoleAssignment er bevisst ekskludert fra
  auto-logging slik at disse får domene­spesifikke handlinger i stedet for
  generiske CREATE/UPDATE).
- `LOGIN` / `LOGIN_FAILED` – logges av login-server-action (`app/login/actions.ts`)
  med IP/user-agent, også når innlogging feiler.
- `EXPORT` – logges av eksport-endepunktene.

### Innhold i loggen

Hver `AuditLog`-rad inneholder: `timestamp`, `adminUserId` (nullbar),
`adminEmail` (**duplisert** så loggen overlever sletting av admin – relasjonen
er `onDelete: SetNull`), `action`, `entityType`, `entityId`, `entityLabel`
(menneskelig lesbar), `before`/`after` (JSON), `metadata`, `ipAddress`,
`userAgent`.

`passwordHash` fjernes alltid før `before`/`after` skrives.

### Uforanderlighet

Det finnes ingen API- eller UI-vei for å oppdatere eller slette `AuditLog`.
Audit-siden (`/dashboard/audit`) er kun lesing/søk/filtrering.

## Tilgangskontroll

- **Sesjon**: NextAuth JWT. `role` legges på token i `jwt`-callback og
  eksponeres i `session`-callback.
- **Ruteproteksjon**: `app/dashboard/layout.tsx` (server) sjekker sesjon og
  redirigerer til `/login`. Innstillinger-siden krever i tillegg `ADMIN`.
- **API**: `withApi` krever autentisert sesjon. Muterende handlinger kaller
  `assertCanMutate(session)` som kaster `ForbiddenError` (→ 403) for `AUDITOR`.
- **Validering**: All input valideres med zod-skjemaer (`lib/validators.ts`).

## Eksport

`lib/export-data.ts` bygger et serialiserbart datasett (oppsummering, matrise,
per person, per system, audit). `lib/export-excel.ts` (exceljs) lager en
arbeidsbok med fire ark; `lib/export-pdf.tsx` (@react-pdf/renderer) lager en
PDF-rapport. Begge kjøres i Node-runtime og er markert som eksterne pakker i
`next.config.mjs` for å unngå bundling-problemer.
