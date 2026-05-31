import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays } from "date-fns";

// A plain client (no audit extension) so seed operations are NOT audited,
// per the spec requirement to skip auditing during seeding.
const prisma = new PrismaClient();

const BCRYPT_COST = 12;

async function main() {
  console.log("Seeding database…");

  // --- Admin users ----------------------------------------------------------
  const [adminHash, auditorHash] = await Promise.all([
    bcrypt.hash("admin123", BCRYPT_COST),
    bcrypt.hash("auditor123", BCRYPT_COST),
  ]);

  await prisma.adminUser.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin Adminsen",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  await prisma.adminUser.upsert({
    where: { email: "auditor@example.com" },
    update: {},
    create: {
      email: "auditor@example.com",
      name: "Revisor Revisen",
      passwordHash: auditorHash,
      role: "AUDITOR",
    },
  });

  // --- Systems and roles ----------------------------------------------------
  const m365 = await prisma.system.upsert({
    where: { name: "Microsoft 365" },
    update: {},
    create: {
      name: "Microsoft 365",
      description: "Produktivitet, e-post og samhandling.",
      category: "Produktivitet",
      ownerEmail: "it-drift@example.com",
      url: "https://admin.microsoft.com",
    },
  });

  const salesforce = await prisma.system.upsert({
    where: { name: "Salesforce" },
    update: {},
    create: {
      name: "Salesforce",
      description: "CRM for salg og kundeoppfølging.",
      category: "CRM",
      ownerEmail: "salgssjef@example.com",
      url: "https://login.salesforce.com",
    },
  });

  // --- Risk levels (configurable) -------------------------------------------
  const riskLevelDefs = [
    { id: "risk_low", key: "LOW", label: "Lav", color: "#64748b", severity: 1, description: "Begrenset tilgang med liten risiko ved misbruk." },
    { id: "risk_normal", key: "NORMAL", label: "Normal", color: "#3b82f6", severity: 2, description: "Ordinær brukertilgang." },
    { id: "risk_high", key: "HIGH", label: "Høy", color: "#f59e0b", severity: 3, description: "Utvidet tilgang som krever ekstra oppfølging." },
    { id: "risk_critical", key: "CRITICAL", label: "Kritisk", color: "#ef4444", severity: 4, description: "Full eller administrativ tilgang med høy risiko." },
  ] as const;

  const riskId: Record<string, string> = {};
  for (const d of riskLevelDefs) {
    const lvl = await prisma.riskLevel.upsert({
      where: { label: d.label },
      update: { color: d.color, severity: d.severity, description: d.description },
      create: { id: d.id, label: d.label, color: d.color, severity: d.severity, description: d.description },
    });
    riskId[d.key] = lvl.id;
  }

  type RoleDef = { name: string; risk: "LOW" | "NORMAL" | "HIGH" | "CRITICAL"; description: string };
  const m365Roles: RoleDef[] = [
    { name: "Global Administrator", risk: "CRITICAL", description: "Full administrativ tilgang til hele tenanten." },
    { name: "Exchange Administrator", risk: "HIGH", description: "Administrasjon av e-post og Exchange Online." },
    { name: "SharePoint Administrator", risk: "HIGH", description: "Administrasjon av SharePoint og OneDrive." },
    { name: "Standard bruker", risk: "NORMAL", description: "Ordinær lisensiert sluttbruker." },
    { name: "Gjest", risk: "LOW", description: "Ekstern gjestebruker med begrenset tilgang." },
  ];

  const salesforceRoles: RoleDef[] = [
    { name: "System Administrator", risk: "CRITICAL", description: "Full konfigurasjons- og datatilgang." },
    { name: "Sales Manager", risk: "HIGH", description: "Leder med innsyn i hele salgsteamet." },
    { name: "Sales User", risk: "NORMAL", description: "Selger med tilgang til egne kunder og leads." },
    { name: "Read Only", risk: "LOW", description: "Kun lesetilgang til CRM-data." },
  ];

  for (const r of m365Roles) {
    await prisma.role.upsert({
      where: { systemId_name: { systemId: m365.id, name: r.name } },
      update: { riskLevelId: riskId[r.risk], description: r.description },
      create: { systemId: m365.id, name: r.name, description: r.description, riskLevelId: riskId[r.risk] },
    });
  }
  for (const r of salesforceRoles) {
    await prisma.role.upsert({
      where: { systemId_name: { systemId: salesforce.id, name: r.name } },
      update: { riskLevelId: riskId[r.risk], description: r.description },
      create: { systemId: salesforce.id, name: r.name, description: r.description, riskLevelId: riskId[r.risk] },
    });
  }

  const role = async (systemId: string, name: string) => {
    const found = await prisma.role.findUniqueOrThrow({
      where: { systemId_name: { systemId, name } },
    });
    return found;
  };

  const m365Standard = await role(m365.id, "Standard bruker");
  const m365Exchange = await role(m365.id, "Exchange Administrator");
  const m365Global = await role(m365.id, "Global Administrator");
  const sfReadOnly = await role(salesforce.id, "Read Only");
  const sfSalesUser = await role(salesforce.id, "Sales User");
  const sfSalesManager = await role(salesforce.id, "Sales Manager");

  // --- Groups (access templates) --------------------------------------------
  const ansatt = await prisma.group.upsert({
    where: { name: "Ansatt" },
    update: {},
    create: {
      name: "Ansatt",
      description: "Standard tilgangssett for alle fast ansatte.",
    },
  });
  const utvikler = await prisma.group.upsert({
    where: { name: "Utvikler" },
    update: {},
    create: {
      name: "Utvikler",
      description: "Tilleggstilganger for utviklere.",
    },
  });

  const groupRole = async (
    groupId: string,
    roleId: string,
    defaultExpiryDays: number | null,
  ) => {
    await prisma.groupRole.upsert({
      where: { groupId_roleId: { groupId, roleId } },
      update: { defaultExpiryDays },
      create: { groupId, roleId, defaultExpiryDays },
    });
  };

  // "Ansatt": M365 Standard bruker (permanent) + Salesforce Read Only (permanent)
  await groupRole(ansatt.id, m365Standard.id, null);
  await groupRole(ansatt.id, sfReadOnly.id, null);
  // "Utvikler": M365 Standard bruker + a second role (Salesforce Sales User placeholder)
  await groupRole(utvikler.id, m365Standard.id, null);
  await groupRole(utvikler.id, sfSalesUser.id, null);

  // --- Example persons ------------------------------------------------------
  const now = new Date();

  const kari = await prisma.person.upsert({
    where: { email: "kari.nordmann@example.com" },
    update: {},
    create: {
      firstName: "Kari",
      lastName: "Nordmann",
      email: "kari.nordmann@example.com",
      employeeId: "E-1001",
      department: "IT",
      jobTitle: "IT-konsulent",
      employmentType: "EMPLOYEE",
      startDate: subDays(now, 400),
      notes: "Medlem av Ansatt-gruppen.",
    },
  });

  const ola = await prisma.person.upsert({
    where: { email: "ola.hansen@example.com" },
    update: {},
    create: {
      firstName: "Ola",
      lastName: "Hansen",
      email: "ola.hansen@example.com",
      employeeId: "E-1002",
      department: "Salg",
      jobTitle: "Salgskonsulent",
      employmentType: "CONSULTANT",
      startDate: subDays(now, 120),
    },
  });

  const per = await prisma.person.upsert({
    where: { email: "per.berg@example.com" },
    update: {},
    create: {
      firstName: "Per",
      lastName: "Berg",
      email: "per.berg@example.com",
      employeeId: "E-1003",
      department: "Utvikling",
      jobTitle: "Senior utvikler",
      employmentType: "EMPLOYEE",
      startDate: subDays(now, 800),
      notes: "Medlem av Utvikler-gruppen.",
    },
  });

  // Helper to add a person to a group and materialise GROUP assignments,
  // mirroring the group-membership logic used by the app's service layer.
  const addToGroup = async (personId: string, groupId: string) => {
    await prisma.groupMembership.upsert({
      where: { personId_groupId: { personId, groupId } },
      update: {},
      create: { personId, groupId, addedBy: "seed" },
    });
    const groupRoles = await prisma.groupRole.findMany({ where: { groupId } });
    for (const gr of groupRoles) {
      await prisma.roleAssignment.upsert({
        where: {
          personId_roleId_source: {
            personId,
            roleId: gr.roleId,
            source: "GROUP",
          },
        },
        update: {},
        create: {
          personId,
          roleId: gr.roleId,
          source: "GROUP",
          sourceGroupId: groupId,
          grantedBy: "seed",
          expiresAt: gr.defaultExpiryDays
            ? addDays(now, gr.defaultExpiryDays)
            : null,
        },
      });
    }
  };

  await addToGroup(kari.id, ansatt.id);
  await addToGroup(per.id, utvikler.id);

  const directAssign = async (
    personId: string,
    roleId: string,
    expiresAt: Date | null,
    notes?: string,
  ) => {
    await prisma.roleAssignment.upsert({
      where: {
        personId_roleId_source: { personId, roleId, source: "DIRECT" },
      },
      update: { expiresAt, notes },
      create: {
        personId,
        roleId,
        source: "DIRECT",
        grantedBy: "seed",
        expiresAt,
        notes,
      },
    });
  };

  // Kari: direct Exchange Administrator expiring in 5 days (YELLOW).
  await directAssign(
    kari.id,
    m365Exchange.id,
    addDays(now, 5),
    "Midlertidig tilgang for e-postmigrering.",
  );

  // Ola: direct Sales Manager that expired 3 days ago (RED — needs revision).
  await directAssign(
    ola.id,
    sfSalesManager.id,
    subDays(now, 3),
    "Vikariat som salgsleder — utløpt.",
  );
  // Ola also gets a permanent Salesforce Read Only directly.
  await directAssign(ola.id, sfReadOnly.id, null);

  // Per: direct Global Administrator, permanent (GREEN, CRITICAL risk).
  await directAssign(
    per.id,
    m365Global.id,
    null,
    "Driftsansvarlig for M365-tenant.",
  );

  // --- Physical resources ---------------------------------------------------
  // Configurable resource types (door, gate, car, …).
  const resourceTypeDefs = [
    { id: "rtype_door", label: "Dør", icon: "DoorOpen", description: "Dør med adgangskontroll." },
    { id: "rtype_gate", label: "Port", icon: "DoorClosed", description: "Port eller bom." },
    { id: "rtype_car", label: "Bil", icon: "Car", description: "Tjeneste-/firmabil." },
    { id: "rtype_room", label: "Rom", icon: "Building2", description: "Rom eller sone." },
  ] as const;
  const resourceTypeId: Record<string, string> = {};
  for (const d of resourceTypeDefs) {
    const t = await prisma.resourceType.upsert({
      where: { label: d.label },
      update: { icon: d.icon, description: d.description },
      create: { id: d.id, label: d.label, icon: d.icon, description: d.description },
    });
    resourceTypeId[d.label] = t.id;
  }

  // Configurable access methods (physical key, app, keycard, …).
  const accessMethodDefs = [
    { id: "amethod_key", label: "Fysisk nøkkel", requiresCredential: true, description: "Tradisjonell nøkkel som utleveres." },
    { id: "amethod_card", label: "Nøkkelkort", requiresCredential: true, description: "RFID-/NFC-kort." },
    { id: "amethod_app", label: "App", requiresCredential: false, description: "Adgang via mobilapp." },
    { id: "amethod_code", label: "Kode/PIN", requiresCredential: false, description: "Tastatur med PIN-kode." },
  ] as const;
  const accessMethodId: Record<string, string> = {};
  for (const d of accessMethodDefs) {
    const m = await prisma.accessMethod.upsert({
      where: { label: d.label },
      update: { requiresCredential: d.requiresCredential, description: d.description },
      create: {
        id: d.id,
        label: d.label,
        requiresCredential: d.requiresCredential,
        description: d.description,
      },
    });
    accessMethodId[d.label] = m.id;
  }

  // Example resources.
  const frontDoor = await prisma.resource.upsert({
    where: { name: "Hovedinngang" },
    update: {},
    create: {
      name: "Hovedinngang",
      description: "Hovedinngang i resepsjonen.",
      typeId: resourceTypeId["Dør"],
      location: "Bygg A – 1. etasje",
      identifier: "DØR-001",
      riskLevelId: riskId["NORMAL"],
      ownerPersonId: kari.id,
    },
  });

  const serverRoom = await prisma.resource.upsert({
    where: { name: "Serverrom" },
    update: {},
    create: {
      name: "Serverrom",
      description: "Adgang til serverrom med kritisk infrastruktur.",
      typeId: resourceTypeId["Rom"],
      location: "Bygg A – kjeller",
      identifier: "DØR-K01",
      riskLevelId: riskId["CRITICAL"],
      ownerPersonId: per.id,
    },
  });

  const serviceCar = await prisma.resource.upsert({
    where: { name: "Tjenestebil EL12345" },
    update: {},
    create: {
      name: "Tjenestebil EL12345",
      description: "Elektrisk tjenestebil for salgsavdelingen.",
      typeId: resourceTypeId["Bil"],
      identifier: "EL12345",
      riskLevelId: riskId["NORMAL"],
    },
  });

  const grantResource = async (
    personId: string,
    resourceId: string,
    methodLabel: string,
    opts: { credentialId?: string; expiresAt?: Date | null; notes?: string } = {},
  ) => {
    const methodId = accessMethodId[methodLabel];
    await prisma.resourceAccess.upsert({
      where: {
        personId_resourceId_methodId: { personId, resourceId, methodId },
      },
      update: {},
      create: {
        personId,
        resourceId,
        methodId,
        credentialId: opts.credentialId,
        expiresAt: opts.expiresAt ?? null,
        notes: opts.notes,
        grantedBy: "seed",
      },
    });
  };

  // Kari: permanent keycard to the front door.
  await grantResource(kari.id, frontDoor.id, "Nøkkelkort", {
    credentialId: "KORT-1001",
    notes: "Fast ansatt – generell adgang.",
  });
  // Per: physical key to the server room (critical), permanent.
  await grantResource(per.id, serverRoom.id, "Fysisk nøkkel", {
    credentialId: "NØKKEL-S07",
    notes: "Driftsansvarlig.",
  });
  // Ola: app access to the service car, expiring soon (yellow).
  await grantResource(ola.id, serviceCar.id, "App", {
    expiresAt: addDays(now, 10),
    notes: "Midlertidig lån i salgsprosjekt.",
  });

  console.log("Seed complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
