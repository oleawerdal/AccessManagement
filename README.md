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

```bash
docker compose up -d
```

Dette starter Postgres på `localhost:5432` med bruker/passord/database
`tilgang` / `tilgang` / `tilgangsstyring` (samsvarer med `.env.example`).

> Kjører du Postgres et annet sted, oppdater `DATABASE_URL` i `.env`.

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

## Deploy (Docker / Coolify)

Repoet inneholder en produksjonsklar `Dockerfile` (Next.js **standalone**) og et
`docker-entrypoint.sh` som kjører `prisma migrate deploy` automatisk før serveren
starter. Imaget bygges uten databasetilkobling (hele dashbordet er dynamisk).

### Bygg og kjør med Docker lokalt

```bash
docker build -t tilgangsstyring .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://bruker:passord@host:5432/db" \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -e AUTH_URL="http://localhost:3000" \
  -e AUTH_TRUST_HOST="true" \
  tilgangsstyring
```

### Coolify

1. **New Resource → Application** og velg Git-repoet (branch `claude/affectionate-turing-RWAHE`).
2. **Build Pack: Dockerfile** (Coolify finner `Dockerfile` i rota).
3. Legg til en **PostgreSQL**-database: **New Resource → Database → PostgreSQL**.
   Bruk den interne connection-stringen som `DATABASE_URL`.
4. Sett **Environment Variables** på applikasjonen:
   - `DATABASE_URL` – peker på Coolify-Postgres
   - `AUTH_SECRET` – `openssl rand -base64 32`
   - `AUTH_URL` – appens offentlige URL (f.eks. `https://tilgang.example.com`)
   - `AUTH_TRUST_HOST` – `true` (påkrevd bak Coolifys Traefik-proxy)
5. **Port**: appen lytter på `3000` (`EXPOSE 3000`).
6. Deploy. Entrypoint kjører `prisma migrate deploy` mot databasen ved hver start.

> **Første admin-bruker:** seedingen kjøres _ikke_ automatisk i produksjon (og
> krever dev-avhengigheter som ikke er med i runtime-imaget). Kjør seedingen én
> gang fra en utsjekk av repoet mot produksjons-databasen:
>
> ```bash
> DATABASE_URL="<prod-url>" npm run db:seed
> ```
>
> Dette oppretter `admin@example.com` / `auditor@example.com` (samt demodata).
> **Bytt passordene umiddelbart** under Innstillinger, og slett demodata ved behov.

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
