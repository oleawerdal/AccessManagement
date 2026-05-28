# Tilgangsstyring

Internt verktøy for å dokumentere hvilke tilganger personer har i interne
systemer (f.eks. Microsoft 365, Salesforce). Bygget for IT-administratorer som
trenger sporbar, revisjonsvennlig oversikt over hvem som har tilgang til hva –
med utløpsdatoer, fargekoder og en uforanderlig revisjonslogg.

## Teknologi

- **Next.js 14** (App Router) + **TypeScript** (strict)
- **PostgreSQL** via **Prisma ORM**
- **NextAuth.js (Auth.js v5)** – credentials (e-post/passord), forberedt for Microsoft Entra ID SSO
- **Tailwind CSS** + **shadcn/ui** (Geist-font, indigo aksent)
- **@react-pdf/renderer** (PDF) og **exceljs** (Excel)
- **react-hook-form** + **zod** (skjemavalidering)
- **date-fns**, **bcryptjs**

## Kom i gang

### 1. Forutsetninger

- Node.js 20+ og npm
- Docker (for lokal Postgres) – eller en kjørende Postgres-instans

### 2. Installer avhengigheter

```bash
npm install
```

### 3. Miljøvariabler

Kopier malen og juster ved behov:

```bash
cp .env.example .env
```

Generer en `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

### 4. Start database

For lokal utvikling der du kjører appen på verten (`npm run dev`), start kun
databasen:

```bash
docker compose up -d db
```

Dette starter Postgres på `localhost:5432` med bruker/passord/database
`tilgang` / `tilgang` / `tilgangsstyring` (samsvarer med `.env.example`).

> Vil du kjøre _hele_ stacken (app + db) i Docker, se «Deploy» lenger ned:
> `docker compose up --build`.

### 5. Migrer og seed

```bash
npm run db:migrate     # oppretter tabellene
npm run db:seed        # legger inn admin/auditor, systemer, roller, grupper og eksempelpersoner
```

### 6. Start appen

```bash
npm run dev
```

Åpne <http://localhost:3000>. Du blir sendt til innloggingssiden.

## Innlogging (seedede brukere)

| Rolle   | E-post                | Passord      | Tilgang                          |
| ------- | --------------------- | ------------ | -------------------------------- |
| ADMIN   | `admin@example.com`   | `admin123`   | Full tilgang (les + endre)       |
| AUDITOR | `auditor@example.com` | `auditor123` | Kun lesetilgang + eksport        |

> Bytt disse passordene før produksjonsbruk.

## Nyttige kommandoer

| Kommando             | Beskrivelse                              |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Utviklingsserver                         |
| `npm run build`      | Produksjonsbygg (kjører `prisma generate`) |
| `npm run start`      | Start produksjonsbygg                    |
| `npm run db:migrate` | Kjør/utvikle migreringer                 |
| `npm run db:seed`    | Seed databasen                           |
| `npm run db:studio`  | Åpne Prisma Studio                       |
| `npm run db:reset`   | Nullstill DB og kjør seed på nytt        |
| `npm run lint`       | ESLint                                   |

## Arkitektur i korte trekk

- **`app/`** – App Router. `app/login` (innlogging), `app/dashboard/*` (beskyttet
  UI), `app/api/*` (route handlers).
- **`lib/`** – kjernelogikk: Prisma-klient med audit-extension (`prisma.ts`,
  `audit.ts`), NextAuth-config (`auth.ts`), tilgangssjekker (`permissions.ts`),
  zod-skjemaer (`validators.ts`), utløpslogikk (`expiry.ts`), datauttrekk
  (`data.ts`, `export-data.ts`) og eksport (`export-pdf.tsx`, `export-excel.ts`).
- **`components/`** – `ui/` (shadcn), `layout/`, `forms/`, `tables/`, `badges/`.
- **`prisma/`** – `schema.prisma`, migreringer og `seed.ts`.

### Roller og tilgangskontroll

To app-roller: `ADMIN` (full tilgang) og `AUDITOR` (kun lesing + eksport).
Rollesjekk håndheves både i UI (skjuler endrings­knapper) og i API – alle
muterende endepunkter går via `withApi` og krever `ADMIN`, ellers `403`.
`passwordHash` eksponeres aldri til klienten (Prisma `select`).

### Revisjonslogg (audit)

Loggen skrives automatisk av en **Prisma client extension** for CRUD på
innholds­modeller, og av eksplisitte hjelpere for `GRANT`/`REVOKE`/`LOGIN`/
`LOGIN_FAILED`/`EXPORT`. Loggen kan ikke endres eller slettes via UI eller API.
Se `docs/ARCHITECTURE.md` for detaljer.

### Utløp og fargekoder

- **Grønn** – gyldig, mer enn 30 dager igjen
- **Gul** – utløper innen 30 dager
- **Rød** – utløpt, krever revisjon

Dashbordet har en «Krever revisjon»-seksjon der admin kan fornye, revokere
eller markere en tilgang som «fortsatt nødvendig» (alt logges).

### Eksport

- **Excel** (`.xlsx`): ett arbeidsbok med arkene **Matrise**, **Per person**,
  **Per system** og **Audit**. Fryste topprader, autobredde og fargekoding av
  utløpsstatus.
- **PDF**: profesjonell rapport med header, oppsummeringsboks og tabeller for
  per-system og per-person.

Begge eksportene dekker alle tre visningene og logges som `EXPORT`.

## Deploy (Docker Compose / Coolify)

`docker-compose.yaml` definerer **hele stacken** – appen (bygget fra
`Dockerfile`, Next.js standalone) og en PostgreSQL-database. Appen kobler seg
automatisk på `db`-tjenesten, og `docker-entrypoint.sh` kjører
`prisma migrate deploy` ved hver oppstart. Du trenger altså ikke sette opp en
egen database manuelt.

### Kjør hele stacken lokalt

```bash
cp .env.example .env          # sett minst AUTH_SECRET
docker compose up --build
```

Appen blir tilgjengelig på <http://localhost:3000>.

### Coolify

1. **New Resource → Application**, velg Git-repoet (branch `claude/affectionate-turing-RWAHE`).
2. **Build Pack: Docker Compose** (Coolify bruker `docker-compose.yaml` – både app og db reises).
3. **Environment Variables** (Coolify fyller inn `${...}` fra compose):
   - `AUTH_SECRET` – `openssl rand -base64 32` (påkrevd)
   - `AUTH_URL` – appens offentlige URL (f.eks. `https://tilgang.example.com`)
   - `POSTGRES_PASSWORD` – et sterkt passord (bytt fra default)
   - _(valgfritt)_ `BOOTSTRAP_ADMIN_EMAIL` + `BOOTSTRAP_ADMIN_PASSWORD` – se under
4. **Domene**: sett domenet på `app`-tjenesten (port `3000`). `AUTH_TRUST_HOST`
   er allerede satt til `true` i compose for Traefik-proxyen.
5. Deploy. Databasen reises av compose, migreringene kjøres automatisk.

> **Første admin-bruker (anbefalt):** sett `BOOTSTRAP_ADMIN_EMAIL` og
> `BOOTSTRAP_ADMIN_PASSWORD`. Ved første oppstart opprettes denne ADMIN-brukeren
> automatisk (idempotent – hopper over hvis den finnes). Da har du en fungerende
> innlogging uten å seede manuelt.
>
> **Alternativt** (med demodata) kan du kjøre seedingen én gang fra en lokal
> utsjekk mot databasen: `DATABASE_URL="<url>" npm run db:seed` (krever
> dev-avhengigheter, som ikke er med i runtime-imaget). Bytt passordene etterpå.

## Microsoft Entra ID (SSO) – forberedt

Credentials er hovedmetoden. Entra ID er forberedt i `lib/auth.ts` og aktiveres
ved å sette `AUTH_ENTRA_ENABLED=true` og fylle inn `AUTH_MICROSOFT_ENTRA_ID_*`
i `.env`.

## Kjente begrensninger

- **Ruteproteksjon** skjer i `app/dashboard/layout.tsx` (server) og i hvert
  API-endepunkt, ikke i edge-middleware. Dette er bevisst for å unngå å kjøre
  bcrypt/Prisma i edge-runtime.
- **PDF-rapporten** inneholder per-system- og per-person-tabeller, men ikke den
  fulle matrise-rutenettet (matrisen finnes i Excel-eksporten, som egner seg
  bedre for brede rutenett).
- **Revisjonsloggen** beholder de siste 1000 innslagene i eksporter; UI-en
  pagineres uten øvre grense.
- Det finnes ingen `TODO`-kommentarer i koden.
