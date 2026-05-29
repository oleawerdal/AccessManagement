import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

import { assignmentSourceLabel } from "@/lib/labels";
import { expiryStatusLabel, type ExpiryStatus } from "@/lib/expiry";
import type { ExportData } from "@/lib/export-data";

const COLORS = {
  primary: "#4f46e5",
  primaryDark: "#312e81",
  text: "#1f2433",
  muted: "#6b7280",
  border: "#e5e7eb",
  rowAlt: "#f9fafb",
  valid: "#16a34a",
  expiring: "#d97706",
  expired: "#dc2626",
};

const statusColor: Record<ExpiryStatus, string> = {
  VALID: COLORS.valid,
  EXPIRING: COLORS.expiring,
  EXPIRED: COLORS.expired,
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontSize: 9,
    color: COLORS.text,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 8,
    marginBottom: 16,
  },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", color: COLORS.primaryDark },
  subtitle: { fontSize: 9, color: COLORS.muted, marginTop: 2 },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  summaryBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 10,
  },
  summaryValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: COLORS.primaryDark },
  summaryLabel: { fontSize: 8, color: COLORS.muted, marginTop: 2 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 14,
    marginBottom: 6,
    color: COLORS.primaryDark,
  },
  subHeading: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginTop: 10,
    marginBottom: 3,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.primaryDark,
    color: "#fff",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowAlt: { backgroundColor: COLORS.rowAlt },
  cellHeader: { fontFamily: "Helvetica-Bold", fontSize: 8 },
  muted: { color: COLORS.muted },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: COLORS.muted,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
  },
});

function Summary({ data }: { data: ExportData }) {
  const tiles = [
    { label: "Personer", value: data.summary.persons },
    { label: "Systemer", value: data.summary.systems },
    { label: "Aktive tilganger", value: data.summary.activeAssignments },
    { label: "Krever revisjon", value: data.summary.needsRevision },
  ];
  return (
    <View style={styles.summaryRow}>
      {tiles.map((t) => (
        <View key={t.label} style={styles.summaryBox}>
          <Text style={styles.summaryValue}>{t.value}</Text>
          <Text style={styles.summaryLabel}>{t.label}</Text>
        </View>
      ))}
    </View>
  );
}

function fmtDate(d: Date | null) {
  return d ? format(d, "dd.MM.yyyy") : "Permanent";
}

function PerSystemSection({ data }: { data: ExportData }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Tilganger per system</Text>
      {data.systems.map((s) => (
        <View key={s.name} wrap={false}>
          <Text style={styles.subHeading}>{s.name}</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.cellHeader, { width: "30%" }]}>Rolle</Text>
            <Text style={[styles.cellHeader, { width: "15%" }]}>Risiko</Text>
            <Text style={[styles.cellHeader, { width: "30%" }]}>Person</Text>
            <Text style={[styles.cellHeader, { width: "12%" }]}>Kilde</Text>
            <Text style={[styles.cellHeader, { width: "13%" }]}>Status</Text>
          </View>
          {s.rolePeople.flatMap((rp, ri) =>
            rp.people.length === 0
              ? [
                  <View key={`${rp.roleName}-empty`} style={styles.row}>
                    <Text style={{ width: "30%" }}>{rp.roleName}</Text>
                    <Text style={{ width: "15%" }}>
                      {rp.riskLevel}
                    </Text>
                    <Text style={[{ width: "55%" }, styles.muted]}>
                      Ingen tildelinger
                    </Text>
                  </View>,
                ]
              : rp.people.map((person, pi) => (
                  <View
                    key={`${rp.roleName}-${person.name}`}
                    style={[
                      styles.row,
                      (ri + pi) % 2 === 1 ? styles.rowAlt : {},
                    ]}
                  >
                    <Text style={{ width: "30%" }}>
                      {pi === 0 ? rp.roleName : ""}
                    </Text>
                    <Text style={{ width: "15%" }}>
                      {pi === 0 ? rp.riskLevel : ""}
                    </Text>
                    <Text style={{ width: "30%" }}>{person.name}</Text>
                    <Text style={{ width: "12%" }}>
                      {assignmentSourceLabel[person.source]}
                    </Text>
                    <Text style={[{ width: "13%" }, { color: statusColor[person.status] }]}>
                      {expiryStatusLabel[person.status]}
                    </Text>
                  </View>
                )),
          )}
        </View>
      ))}
    </View>
  );
}

function PerPersonSection({ data }: { data: ExportData }) {
  return (
    <View break>
      <Text style={styles.sectionTitle}>Tilganger per person</Text>
      {data.persons.map((p) => (
        <View key={p.id} wrap={false}>
          <Text style={styles.subHeading}>
            {p.name}
            <Text style={styles.muted}>
              {"  "}
              {p.department ?? ""}
            </Text>
          </Text>
          {p.accesses.length === 0 ? (
            <Text style={[styles.muted, { paddingHorizontal: 4, paddingBottom: 4 }]}>
              Ingen tilganger.
            </Text>
          ) : (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.cellHeader, { width: "28%" }]}>System</Text>
                <Text style={[styles.cellHeader, { width: "30%" }]}>Rolle</Text>
                <Text style={[styles.cellHeader, { width: "14%" }]}>Risiko</Text>
                <Text style={[styles.cellHeader, { width: "13%" }]}>Kilde</Text>
                <Text style={[styles.cellHeader, { width: "15%" }]}>Utløp</Text>
              </View>
              {p.accesses.map((a, i) => (
                <View
                  key={`${a.systemName}-${a.roleName}`}
                  style={[styles.row, i % 2 === 1 ? styles.rowAlt : {}]}
                >
                  <Text style={{ width: "28%" }}>{a.systemName}</Text>
                  <Text style={{ width: "30%" }}>{a.roleName}</Text>
                  <Text style={{ width: "14%" }}>{a.riskLevel}</Text>
                  <Text style={{ width: "13%" }}>
                    {assignmentSourceLabel[a.source]}
                  </Text>
                  <Text style={[{ width: "15%" }, { color: statusColor[a.status] }]}>
                    {fmtDate(a.expiresAt)}
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>
      ))}
    </View>
  );
}

function ReportDocument({ data }: { data: ExportData }) {
  const dateStr = format(data.generatedAt, "PPP 'kl.' HH:mm", { locale: nb });
  return (
    <Document title="Tilgangsstyring – rapport">
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.title}>Tilgangsstyring</Text>
            <Text style={styles.subtitle}>Rapport over systemtilganger</Text>
          </View>
          <Text style={styles.subtitle}>Generert {dateStr}</Text>
        </View>

        <Summary data={data} />
        <PerSystemSection data={data} />
        <PerPersonSection data={data} />

        <View style={styles.footer} fixed>
          <Text>Tilgangsstyring – internt og konfidensielt</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Side ${pageNumber} av ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export async function buildPdf(data: ExportData): Promise<Buffer> {
  return renderToBuffer(<ReportDocument data={data} />);
}
