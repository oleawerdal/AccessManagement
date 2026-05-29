import ExcelJS from "exceljs";
import { format } from "date-fns";

import { expiryStatusLabel, type ExpiryStatus } from "@/lib/expiry";
import { assignmentSourceLabel } from "@/lib/labels";
import type { ExportData } from "@/lib/export-data";

const STATUS_FILL: Record<ExpiryStatus, string> = {
  VALID: "FFD1FAE5",
  EXPIRING: "FFFEF3C7",
  EXPIRED: "FFFEE2E2",
};
const HEADER_FILL = "FF312E81"; // indigo-900
const HEADER_FONT = "FFFFFFFF";

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: HEADER_FONT } };
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_FILL },
    };
    cell.alignment = { vertical: "middle" };
  });
}

function autoWidth(sheet: ExcelJS.Worksheet, min = 10, max = 50) {
  sheet.columns.forEach((col) => {
    let width = min;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length + 2;
      if (len > width) width = len;
    });
    col.width = Math.min(width, max);
  });
}

function fmtDate(d: Date | null): string {
  return d ? format(d, "dd.MM.yyyy") : "Permanent";
}

export async function buildExcel(data: ExportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Tilgangsstyring";
  wb.created = data.generatedAt;

  // --- Sheet 1: Matrise -----------------------------------------------------
  const matrix = wb.addWorksheet("Matrise", {
    views: [{ state: "frozen", xSplit: 1, ySplit: 1 }],
  });
  const roleCols = data.systems.flatMap((s) =>
    s.roles.map((r) => ({ id: r.id, label: `${s.name} – ${r.name}` })),
  );
  matrix.columns = [
    { header: "Person", key: "person", width: 28 },
    ...roleCols.map((c) => ({ header: c.label, key: c.id, width: 16 })),
  ];
  styleHeader(matrix.getRow(1));
  for (const p of data.persons) {
    const row = matrix.addRow({ person: p.name });
    roleCols.forEach((c) => {
      const cell = data.matrix[p.id]?.[c.id];
      const xlCell = row.getCell(c.id);
      if (cell) {
        xlCell.value = "✓";
        xlCell.alignment = { horizontal: "center" };
        xlCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: STATUS_FILL[cell.status] },
        };
      }
    });
  }

  // --- Sheet 2: Per person --------------------------------------------------
  const perPerson = wb.addWorksheet("Per person", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  perPerson.columns = [
    { header: "Person", key: "person" },
    { header: "E-post", key: "email" },
    { header: "Avdeling", key: "department" },
    { header: "System", key: "system" },
    { header: "Rolle", key: "role" },
    { header: "Risiko", key: "risk" },
    { header: "Kilde", key: "source" },
    { header: "Status", key: "status" },
    { header: "Utløp", key: "expires" },
  ];
  styleHeader(perPerson.getRow(1));
  for (const p of data.persons) {
    if (p.accesses.length === 0) {
      perPerson.addRow({
        person: p.name,
        email: p.email,
        department: p.department ?? "",
        role: "(ingen tilganger)",
      });
      continue;
    }
    for (const a of p.accesses) {
      const row = perPerson.addRow({
        person: p.name,
        email: p.email,
        department: p.department ?? "",
        system: a.systemName,
        role: a.roleName,
        risk: a.riskLevel,
        source: assignmentSourceLabel[a.source],
        status: expiryStatusLabel[a.status],
        expires: fmtDate(a.expiresAt),
      });
      row.getCell("status").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: STATUS_FILL[a.status] },
      };
    }
  }
  autoWidth(perPerson);

  // --- Sheet 3: Per system --------------------------------------------------
  const perSystem = wb.addWorksheet("Per system", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  perSystem.columns = [
    { header: "System", key: "system" },
    { header: "Rolle", key: "role" },
    { header: "Risiko", key: "risk" },
    { header: "Person", key: "person" },
    { header: "Kilde", key: "source" },
    { header: "Status", key: "status" },
    { header: "Utløp", key: "expires" },
  ];
  styleHeader(perSystem.getRow(1));
  for (const s of data.systems) {
    for (const rp of s.rolePeople) {
      if (rp.people.length === 0) {
        perSystem.addRow({
          system: s.name,
          role: rp.roleName,
          risk: rp.riskLevel,
          person: "(ingen)",
        });
        continue;
      }
      for (const person of rp.people) {
        const row = perSystem.addRow({
          system: s.name,
          role: rp.roleName,
          risk: rp.riskLevel,
          person: person.name,
          source: assignmentSourceLabel[person.source],
          status: expiryStatusLabel[person.status],
          expires: fmtDate(person.expiresAt),
        });
        row.getCell("status").fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: STATUS_FILL[person.status] },
        };
      }
    }
  }
  autoWidth(perSystem);

  // --- Sheet 4: Audit -------------------------------------------------------
  const auditSheet = wb.addWorksheet("Audit", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  auditSheet.columns = [
    { header: "Tidspunkt", key: "ts" },
    { header: "Handling", key: "action" },
    { header: "Entitet", key: "entityType" },
    { header: "Navn", key: "label" },
    { header: "Adminbruker", key: "admin" },
    { header: "IP", key: "ip" },
  ];
  styleHeader(auditSheet.getRow(1));
  for (const log of data.audit) {
    auditSheet.addRow({
      ts: format(log.timestamp, "dd.MM.yyyy HH:mm:ss"),
      action: log.action,
      entityType: log.entityType,
      label: log.entityLabel ?? "",
      admin: log.adminEmail,
      ip: log.ipAddress ?? "",
    });
  }
  autoWidth(auditSheet);

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
