import { getMatrixData } from "@/lib/data";
import { PageHeader } from "@/components/layout/page-header";
import { MatrixTable } from "@/components/tables/matrix-table";
import { ExportButtons } from "@/components/export/export-buttons";

export default async function MatrixPage() {
  const { systems, persons, cells } = await getMatrixData();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tilgangsmatrise"
        description="Personer mot roller, gruppert per system. Klikk en celle for detaljer."
      >
        <ExportButtons />
      </PageHeader>

      <MatrixTable systems={systems} persons={persons} cells={cells} />
    </div>
  );
}
