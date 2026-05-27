"use client";

import { useState } from "react";
import { FileText, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

async function download(url: string, fallbackName: string) {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Eksport feilet (${res.status}).`);
  }
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? fallbackName;
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export function ExportButtons({ query = "" }: { query?: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<"pdf" | "excel" | null>(null);

  async function run(format: "pdf" | "excel", ext: string) {
    setLoading(format);
    try {
      await download(`/api/export/${format}${query}`, `tilgangsstyring.${ext}`);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Eksport feilet",
        description: err instanceof Error ? err.message : "Ukjent feil.",
      });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={loading !== null}
        onClick={() => run("pdf", "pdf")}
      >
        <FileText className="h-4 w-4" />
        {loading === "pdf" ? "Genererer…" : "PDF"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={loading !== null}
        onClick={() => run("excel", "xlsx")}
      >
        <FileSpreadsheet className="h-4 w-4" />
        {loading === "excel" ? "Genererer…" : "Excel"}
      </Button>
    </div>
  );
}
