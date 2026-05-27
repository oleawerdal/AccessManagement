import { NextResponse } from "next/server";
import { format } from "date-fns";

import { withApi } from "@/lib/api";
import { buildExportData } from "@/lib/export-data";
import { buildPdf } from "@/lib/export-pdf";
import { logExport } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return withApi(async () => {
    const data = await buildExportData();
    const buffer = await buildPdf(data);
    await logExport({ format: "PDF", view: "Full rapport" });

    const filename = `tilgangsstyring-${format(new Date(), "yyyy-MM-dd")}.pdf`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
