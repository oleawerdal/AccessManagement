// OpenAPI 3.0 description of the external REST API (/api/v1). Hand-authored to
// mirror the route handlers, Zod validators (lib/validators.ts) and DTO
// serializers (lib/v1/serializers.ts). Served as JSON at /api/v1/openapi.json
// and rendered by Swagger UI at /api/v1/docs.

const nullableString = { type: "string", nullable: true } as const;

const employmentType = {
  type: "string",
  enum: ["EMPLOYEE", "CONSULTANT", "EXTERNAL", "INTERN"],
} as const;

const role = {
  type: "string",
  enum: ["ADMIN", "AUDITOR"],
} as const;

function listEnvelope(ref: string) {
  return {
    type: "object",
    properties: {
      data: { type: "array", items: { $ref: ref } },
      pagination: { $ref: "#/components/schemas/Pagination" },
    },
  };
}

const json = (ref: string) => ({
  content: { "application/json": { schema: { $ref: ref } } },
});

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Tilgangsstyring – REST API",
    version: "1.0.0",
    description:
      "Maskin-til-maskin REST API for å administrere personer, systemer, roller og tildelinger. " +
      "Autentiser med en API-nøkkel som bearer-token: `Authorization: Bearer <nøkkel>`. " +
      "Nøkler opprettes i web-grensesnittet under Innstillinger → API-nøkler. " +
      "ADMIN-nøkler kan endre data; AUDITOR-nøkler har kun lesetilgang.",
  },
  servers: [{ url: "/api/v1", description: "Denne instansen" }],
  security: [{ bearerAuth: [] }],
  tags: [
    { name: "Personer" },
    { name: "Systemer" },
    { name: "Roller" },
    { name: "Tildelinger" },
  ],
  paths: {
    "/persons": {
      get: {
        tags: ["Personer"],
        summary: "List personer",
        parameters: [
          { $ref: "#/components/parameters/Page" },
          { $ref: "#/components/parameters/PageSize" },
          {
            name: "active",
            in: "query",
            schema: { type: "boolean" },
            description: "Filtrer på aktiv/inaktiv.",
          },
          {
            name: "q",
            in: "query",
            schema: { type: "string" },
            description: "Søk i navn, e-post og ansatt-ID.",
          },
        ],
        responses: {
          "200": {
            description: "Paginert liste over personer.",
            content: {
              "application/json": {
                schema: listEnvelope("#/components/schemas/Person"),
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Personer"],
        summary: "Opprett person",
        requestBody: {
          required: true,
          ...json("#/components/schemas/PersonInput"),
        },
        responses: {
          "201": { description: "Opprettet.", ...json("#/components/schemas/Person") },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "409": { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/persons/{id}": {
      parameters: [{ $ref: "#/components/parameters/Id" }],
      get: {
        tags: ["Personer"],
        summary: "Hent person",
        responses: {
          "200": { description: "OK.", ...json("#/components/schemas/Person") },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Personer"],
        summary: "Oppdater person (delvis)",
        requestBody: {
          required: true,
          ...json("#/components/schemas/PersonUpdate"),
        },
        responses: {
          "200": { description: "Oppdatert.", ...json("#/components/schemas/Person") },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Personer"],
        summary: "Slett person",
        responses: {
          "200": { description: "Slettet.", ...json("#/components/schemas/DeleteResult") },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/systems": {
      get: {
        tags: ["Systemer"],
        summary: "List systemer",
        parameters: [
          { $ref: "#/components/parameters/Page" },
          { $ref: "#/components/parameters/PageSize" },
          { name: "active", in: "query", schema: { type: "boolean" } },
          {
            name: "q",
            in: "query",
            schema: { type: "string" },
            description: "Søk i navn og kategori.",
          },
        ],
        responses: {
          "200": {
            description: "Paginert liste over systemer.",
            content: {
              "application/json": {
                schema: listEnvelope("#/components/schemas/System"),
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Systemer"],
        summary: "Opprett system",
        requestBody: { required: true, ...json("#/components/schemas/SystemInput") },
        responses: {
          "201": { description: "Opprettet.", ...json("#/components/schemas/System") },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "409": { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/systems/{id}": {
      parameters: [{ $ref: "#/components/parameters/Id" }],
      get: {
        tags: ["Systemer"],
        summary: "Hent system",
        responses: {
          "200": { description: "OK.", ...json("#/components/schemas/System") },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Systemer"],
        summary: "Oppdater system (delvis)",
        requestBody: { required: true, ...json("#/components/schemas/SystemUpdate") },
        responses: {
          "200": { description: "Oppdatert.", ...json("#/components/schemas/System") },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Systemer"],
        summary: "Slett system",
        description: "Sletter også systemets roller og tilhørende tildelinger (kaskade).",
        responses: {
          "200": { description: "Slettet.", ...json("#/components/schemas/DeleteResult") },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/roles": {
      get: {
        tags: ["Roller"],
        summary: "List roller",
        parameters: [
          { $ref: "#/components/parameters/Page" },
          { $ref: "#/components/parameters/PageSize" },
          {
            name: "systemId",
            in: "query",
            schema: { type: "string" },
            description: "Filtrer på system.",
          },
          { name: "q", in: "query", schema: { type: "string" }, description: "Søk i navn." },
        ],
        responses: {
          "200": {
            description: "Paginert liste over roller.",
            content: {
              "application/json": {
                schema: listEnvelope("#/components/schemas/Role"),
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Roller"],
        summary: "Opprett rolle",
        requestBody: { required: true, ...json("#/components/schemas/RoleInput") },
        responses: {
          "201": { description: "Opprettet.", ...json("#/components/schemas/Role") },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "409": { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/roles/{id}": {
      parameters: [{ $ref: "#/components/parameters/Id" }],
      get: {
        tags: ["Roller"],
        summary: "Hent rolle",
        responses: {
          "200": { description: "OK.", ...json("#/components/schemas/Role") },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Roller"],
        summary: "Oppdater rolle (delvis)",
        description: "`systemId` kan ikke endres.",
        requestBody: { required: true, ...json("#/components/schemas/RoleUpdate") },
        responses: {
          "200": { description: "Oppdatert.", ...json("#/components/schemas/Role") },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Roller"],
        summary: "Slett rolle",
        responses: {
          "200": { description: "Slettet.", ...json("#/components/schemas/DeleteResult") },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/assignments": {
      get: {
        tags: ["Tildelinger"],
        summary: "List tildelinger",
        parameters: [
          { $ref: "#/components/parameters/Page" },
          { $ref: "#/components/parameters/PageSize" },
          { name: "personId", in: "query", schema: { type: "string" } },
          { name: "roleId", in: "query", schema: { type: "string" } },
          { name: "systemId", in: "query", schema: { type: "string" } },
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["ACTIVE", "EXPIRED", "REVOKED"] },
          },
        ],
        responses: {
          "200": {
            description: "Paginert liste over tildelinger.",
            content: {
              "application/json": {
                schema: listEnvelope("#/components/schemas/Assignment"),
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Tildelinger"],
        summary: "Tildel rolle direkte til person",
        requestBody: { required: true, ...json("#/components/schemas/AssignmentInput") },
        responses: {
          "201": { description: "Tildelt.", ...json("#/components/schemas/Assignment") },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "409": {
            description: "Personen har allerede denne rollen direkte (aktiv).",
            ...json("#/components/schemas/Error"),
          },
        },
      },
    },
    "/assignments/{id}": {
      parameters: [{ $ref: "#/components/parameters/Id" }],
      get: {
        tags: ["Tildelinger"],
        summary: "Hent tildeling",
        responses: {
          "200": { description: "OK.", ...json("#/components/schemas/Assignment") },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Tildelinger"],
        summary: "Forny / endre utløp",
        description:
          "Setter ny utløpsdato (eller `null` for permanent) og reaktiverer en revokert tildeling.",
        requestBody: { required: true, ...json("#/components/schemas/AssignmentRenew") },
        responses: {
          "200": { description: "Oppdatert.", ...json("#/components/schemas/Assignment") },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Tildelinger"],
        summary: "Slett tildeling (hard)",
        responses: {
          "200": { description: "Slettet.", ...json("#/components/schemas/DeleteResult") },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/assignments/{id}/revoke": {
      parameters: [{ $ref: "#/components/parameters/Id" }],
      post: {
        tags: ["Tildelinger"],
        summary: "Revoker tildeling",
        requestBody: { required: true, ...json("#/components/schemas/AssignmentRevoke") },
        responses: {
          "200": { description: "Revokert.", ...json("#/components/schemas/Assignment") },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "API-nøkkel, f.eks. `am_<prefix>_<secret>`.",
      },
    },
    parameters: {
      Id: {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string" },
      },
      Page: {
        name: "page",
        in: "query",
        schema: { type: "integer", minimum: 1, default: 1 },
      },
      PageSize: {
        name: "pageSize",
        in: "query",
        schema: { type: "integer", minimum: 1, maximum: 200, default: 50 },
      },
    },
    responses: {
      Unauthorized: {
        description: "Mangler, ugyldig, utløpt eller deaktivert API-nøkkel.",
        ...json("#/components/schemas/Error"),
      },
      Forbidden: {
        description: "Nøkkelen har kun lesetilgang (AUDITOR).",
        ...json("#/components/schemas/Error"),
      },
      NotFound: {
        description: "Ressursen finnes ikke.",
        ...json("#/components/schemas/Error"),
      },
      ValidationError: {
        description: "Valideringsfeil.",
        ...json("#/components/schemas/Error"),
      },
      Conflict: {
        description: "Konflikt – verdien finnes allerede.",
        ...json("#/components/schemas/Error"),
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          issues: { type: "object", nullable: true },
        },
        required: ["error"],
      },
      Pagination: {
        type: "object",
        properties: {
          page: { type: "integer" },
          pageSize: { type: "integer" },
          total: { type: "integer" },
          totalPages: { type: "integer" },
        },
      },
      DeleteResult: {
        type: "object",
        properties: {
          deleted: { type: "boolean", example: true },
          id: { type: "string" },
        },
      },
      Person: {
        type: "object",
        properties: {
          id: { type: "string" },
          firstName: { type: "string" },
          lastName: { type: "string" },
          email: { type: "string", format: "email" },
          employeeId: nullableString,
          department: nullableString,
          jobTitle: nullableString,
          employmentType,
          startDate: { type: "string", format: "date-time", nullable: true },
          endDate: { type: "string", format: "date-time", nullable: true },
          active: { type: "boolean" },
          notes: nullableString,
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      PersonInput: {
        type: "object",
        required: ["firstName", "lastName", "email"],
        properties: {
          firstName: { type: "string" },
          lastName: { type: "string" },
          email: { type: "string", format: "email" },
          employeeId: { type: "string" },
          department: { type: "string" },
          jobTitle: { type: "string" },
          employmentType,
          startDate: { type: "string", format: "date-time" },
          endDate: { type: "string", format: "date-time" },
          active: { type: "boolean", default: true },
          notes: { type: "string" },
        },
      },
      PersonUpdate: {
        type: "object",
        description: "Alle felter valgfrie (delvis oppdatering).",
        properties: {
          firstName: { type: "string" },
          lastName: { type: "string" },
          email: { type: "string", format: "email" },
          employeeId: { type: "string" },
          department: { type: "string" },
          jobTitle: { type: "string" },
          employmentType,
          startDate: { type: "string", format: "date-time" },
          endDate: { type: "string", format: "date-time" },
          active: { type: "boolean" },
          notes: { type: "string" },
        },
      },
      System: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: nullableString,
          category: nullableString,
          ownerEmail: nullableString,
          ownerPersonId: nullableString,
          url: nullableString,
          active: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      SystemInput: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          category: { type: "string" },
          ownerEmail: { type: "string", format: "email" },
          ownerPersonId: { type: "string", nullable: true },
          url: { type: "string", format: "uri" },
          active: { type: "boolean", default: true },
        },
      },
      SystemUpdate: {
        type: "object",
        description: "Alle felter valgfrie (delvis oppdatering).",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          category: { type: "string" },
          ownerEmail: { type: "string", format: "email" },
          ownerPersonId: { type: "string", nullable: true },
          url: { type: "string", format: "uri" },
          active: { type: "boolean" },
        },
      },
      RiskLevel: {
        type: "object",
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          description: nullableString,
          color: { type: "string", example: "#3b82f6" },
          severity: { type: "integer" },
        },
      },
      Role: {
        type: "object",
        properties: {
          id: { type: "string" },
          systemId: { type: "string" },
          name: { type: "string" },
          description: nullableString,
          riskLevelId: { type: "string" },
          riskLevel: { $ref: "#/components/schemas/RiskLevel" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          system: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
            },
          },
        },
      },
      RoleInput: {
        type: "object",
        required: ["systemId", "name", "riskLevelId"],
        properties: {
          systemId: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          riskLevelId: { type: "string" },
        },
      },
      RoleUpdate: {
        type: "object",
        description: "Alle felter valgfrie. `systemId` kan ikke endres.",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          riskLevelId: { type: "string" },
        },
      },
      Assignment: {
        type: "object",
        properties: {
          id: { type: "string" },
          personId: { type: "string" },
          roleId: { type: "string" },
          source: { type: "string", enum: ["DIRECT", "GROUP"] },
          sourceGroupId: nullableString,
          status: { type: "string", enum: ["ACTIVE", "EXPIRED", "REVOKED"] },
          expiryStatus: { type: "string", enum: ["VALID", "EXPIRING", "EXPIRED"] },
          grantedAt: { type: "string", format: "date-time" },
          grantedBy: nullableString,
          expiresAt: { type: "string", format: "date-time", nullable: true },
          revokedAt: { type: "string", format: "date-time", nullable: true },
          revokedBy: nullableString,
          revokeReason: nullableString,
          notes: nullableString,
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      AssignmentInput: {
        type: "object",
        required: ["personId", "roleId"],
        properties: {
          personId: { type: "string" },
          roleId: { type: "string" },
          expiresAt: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Utløpsdato, eller null/utelatt for permanent.",
          },
          notes: { type: "string" },
        },
      },
      AssignmentRenew: {
        type: "object",
        required: ["expiresAt"],
        properties: {
          expiresAt: {
            type: "string",
            format: "date-time",
            nullable: true,
            description: "Ny utløpsdato, eller null for permanent.",
          },
          notes: { type: "string" },
        },
      },
      AssignmentRevoke: {
        type: "object",
        required: ["reason"],
        properties: {
          reason: { type: "string", description: "Begrunnelse (påkrevd)." },
        },
      },
    },
  },
} as const;
