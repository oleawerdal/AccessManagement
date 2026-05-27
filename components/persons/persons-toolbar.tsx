"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { employmentTypeLabel } from "@/lib/labels";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

export function PersonsToolbar({ departments }: { departments: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function apply(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === "" || value === ALL) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    startTransition(() => router.replace(`/dashboard/persons?${params.toString()}`));
  }

  // Debounce the free-text search.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((searchParams.get("q") ?? "") !== q) apply({ q });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative sm:max-w-xs sm:flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Søk navn eller e-post…"
          className="pl-8"
          aria-label="Søk personer"
        />
      </div>

      <Select
        defaultValue={searchParams.get("department") ?? ALL}
        onValueChange={(v) => apply({ department: v })}
      >
        <SelectTrigger className="sm:w-44" aria-label="Filtrer avdeling">
          <SelectValue placeholder="Avdeling" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Alle avdelinger</SelectItem>
          {departments.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        defaultValue={searchParams.get("employmentType") ?? ALL}
        onValueChange={(v) => apply({ employmentType: v })}
      >
        <SelectTrigger className="sm:w-40" aria-label="Filtrer ansettelsestype">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Alle typer</SelectItem>
          {Object.entries(employmentTypeLabel).map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        defaultValue={searchParams.get("active") ?? ALL}
        onValueChange={(v) => apply({ active: v })}
      >
        <SelectTrigger className="sm:w-36" aria-label="Filtrer status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Alle</SelectItem>
          <SelectItem value="true">Aktive</SelectItem>
          <SelectItem value="false">Inaktive</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
