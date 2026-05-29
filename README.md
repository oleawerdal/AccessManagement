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

## E-post og varsler

Utgående e-post (f.eks. **SMTP2GO**) konfigureres i appen under **Innstillinger →
E-post (SMTP)** – vert, port, brukernavn/passord, avsendernavn og -adresse.
Innstillingene lagres i databasen (passordet vises aldri tilbake til klienten).
Bruk «Send test-e-post» for å verifisere oppsettet.

E-post brukes til:

- **Utløpsvarsler:** når en tilgang utløper, varsles systemeieren og alle
  aktive admins (én gang per tilgang). Dette kjøres av et beskyttet endepunkt:

  ```bash
  curl -X POST https://<din-url>/api/cron/expiry-reminders \
    -H "Authorization: Bearer $CRON_SECRET"
  ```

  Sett `CRON_SECRET` og kall endepunktet fra en planlagt jobb (f.eks. en daglig
  Coolify scheduled task eller ekstern cron).

- **Passord-lenker:** admins kan sende en «sett/tilbakestill passord»-lenke til
  en bruker fra Innstillinger, og brukere kan be om tilbakestilling selv via
  «Glemt passord?» på innloggingssiden. Lenkene er engangs og varer i 24 timer.

## Microsoft Entra ID (SSO)

Credentials (e-post/passord) er hovedmetoden. I tillegg kan **Microsoft Entra
ID** brukes som single sign-on. Når det er aktivert vises en «Logg inn med
Microsoft»-knapp på innloggingssiden.

**Tilgangsmodell – kun forhåndsopprettede brukere:** SSO oppretter aldri nye
kontoer. En admin må først opprette adminbrukeren (med riktig rolle) under
**Innstillinger**, med samme e-post som i Entra. Logger noen inn via Entra med en
e-post som ikke finnes – eller en deaktivert konto – avvises de. Rollen
(`ADMIN`/`AUDITOR`) hentes fra adminbrukeren, ikke fra Entra.

### Aktivering

Registrer først en app i Entra (Azure) med redirect-URI
`<AUTH_URL>/api/auth/callback/microsoft-entra-id`, og opprett adminbrukerne med
deres Entra-e-post under Innstillinger.

Deretter kan SSO konfigureres på to måter:

- **I appen (anbefalt):** Innstillinger → **Single sign-on (SSO)**. Huk av
  «Aktiver», lim inn Application (client) ID, client secret og issuer-URL, og
  lagre. Verdiene lagres i databasen (client secret vises aldri tilbake), og
  endringer slår inn uten redeploy (innen ~30 s). Redirect-URI-en vises i
  skjemaet.
- **Via miljøvariabler** (fallback hvis ingenting er satt i UI):
  `AUTH_ENTRA_ENABLED=true`, `AUTH_MICROSOFT_ENTRA_ID_ID`,
  `AUTH_MICROSOFT_ENTRA_ID_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_ISSUER` (f.eks.
  `https://login.microsoftonline.com/<tenant-id>/v2.0`). `docker-compose.yaml`
  sender disse videre til app-containeren.

Databaseinnstillingene har forrang over miljøvariablene.

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
