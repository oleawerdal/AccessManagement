"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Group = { id: string; name: string };

export function PersonGroups({
  personId,
  memberships,
  canMutate,
}: {
  personId: string;
  memberships: { groupId: string; group: { name: string } }[];
  canMutate: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [adding, setAdding] = useState(false);
  const memberIds = new Set(memberships.map((m) => m.groupId));

  useEffect(() => {
    if (!canMutate) return;
    apiRequest<Group[]>("/api/groups").then(setGroups).catch(() => {});
  }, [canMutate]);

  async function mutate(fn: () => Promise<unknown>, msg: string) {
    setAdding(true);
    try {
      await fn();
      toast({ title: msg });
      router.refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Noe gikk galt",
        description: err instanceof ApiError ? err.message : "Ukjent feil.",
      });
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {memberships.length === 0 && (
        <span className="text-sm text-muted-foreground">
          Ingen gruppemedlemskap.
        </span>
      )}
      {memberships.map((m) => (
        <span
          key={m.groupId}
          className="inline-flex items-center gap-1 rounded-md border bg-secondary px-2 py-0.5 text-sm"
        >
          {m.group.name}
          {canMutate && (
            <button
              type="button"
              aria-label={`Fjern fra ${m.group.name}`}
              disabled={adding}
              onClick={() =>
                mutate(
                  () =>
                    apiRequest(`/api/groups/${m.groupId}/members`, {
                      method: "DELETE",
                      body: { personId },
                    }),
                  "Fjernet fra gruppe.",
                )
              }
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </span>
      ))}

      {canMutate && (
        <Select
          value=""
          onValueChange={(groupId) =>
            mutate(
              () =>
                apiRequest(`/api/groups/${groupId}/members`, {
                  method: "POST",
                  body: { personId },
                }),
              "Lagt til i gruppe.",
            )
          }
        >
          <SelectTrigger className="h-7 w-auto gap-1 border-dashed px-2 text-xs">
            <Plus className="h-3.5 w-3.5" />
            <SelectValue placeholder="Legg til gruppe" />
          </SelectTrigger>
          <SelectContent>
            {groups
              .filter((g) => !memberIds.has(g.id))
              .map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
