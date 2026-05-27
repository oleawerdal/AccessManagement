import { PageHeader } from "@/components/layout/page-header";
import { AuditTable } from "@/components/tables/audit-table";

export default function AuditPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Revisjonslogg"
        description="Komplett, uforanderlig logg over all aktivitet. Kan ikke endres eller slettes."
      />
      <AuditTable />
    </div>
  );
}
