"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";

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

type Member = {
  personId: string;
  person: { id: string; firstName: string; lastName: string; email: string };
};
type PersonOption = { id: string; firstName: string; lastName: string };

export function GroupMembers({
  groupId,
  members,
  canMutate,
}: {
  groupId: string;
  members: Member[];
  canMutate: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [persons, setPersons] = useState<PersonOption[]>([]);
  const [pending, setPending] = useState(false);
  const memberIds = new Set(members.map((m) => m.personId));

  useEffect(() => {
    if (!canMutate) return;
    apiRequest<PersonOption[]>("/api/persons?active=true")
      .then(setPersons)
      .catch(() => {});
  }, [canMutate]);

  async function mutate(fn: () => Promise<unknown>, msg: string) {
    setPending(true);
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
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      {canMutate && (
        <Select
          value=""
          onValueChange={(personId) =>
            mutate(
              () =>
                apiRequest(`/api/groups/${groupId}/members`, {
                  method: "POST",
                  body: { personId },
                }),
              "Medlem lagt til. Gruppens roller er tildelt.",
            )
          }
        >
          <SelectTrigger className="sm:w-64" aria-label="Legg til medlem">
            <SelectValue placeholder="Legg til person…" />
          </SelectTrigger>
          <SelectContent>
            {persons
              .filter((p) => !memberIds.has(p.id))
              .map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      )}

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ingen medlemmer.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {members.map((m) => (
            <li
              key={m.personId}
              className="flex items-center justify-between px-3 py-2 text-sm"
            >
              <Link
                href={`/dashboard/persons/${m.person.id}`}
                className="hover:underline"
              >
                {m.person.firstName} {m.person.lastName}
                <span className="ml-2 text-xs text-muted-foreground">
                  {m.person.email}
                </span>
              </Link>
              {canMutate && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  disabled={pending}
                  aria-label={`Fjern ${m.person.firstName}`}
                  onClick={() =>
                    mutate(
                      () =>
                        apiRequest(`/api/groups/${groupId}/members`, {
                          method: "DELETE",
                          body: { personId: m.personId },
                        }),
                      "Medlem fjernet. Gruppe-arvede tilganger er fjernet.",
                    )
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
