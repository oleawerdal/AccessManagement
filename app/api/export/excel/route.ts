import { NextResponse } from "next/server";
import { format } from "date-fns";

import { withApi } from "@/lib/api";
import { buildExportData } from "@/lib/export-data";
import { buildExcel } from "@/lib/export-excel";
import { logExport } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return withApi(async () => {
    const data = await buildExportData();
    const buffer = await buildExcel(data);
    await logExport({ format: "EXCEL", view: "Full rapport (alle visninger)" });

    const filename = `tilgangsstyring-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
