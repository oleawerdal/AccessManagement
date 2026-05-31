"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, CreditCard } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";

type MethodOption = { id: string; label: string };
export type CredentialItem = {
  id: string;
  label: string | null;
  identifier: string;
  methodId: string | null;
  active: boolean;
  method?: { label: string } | null;
  _count?: { resourceAccesses: number };
};

function CredentialDialog({
  personId,
  credential,
  methods,
  onSaved,
  trigger,
}: {
  personId: string;
  credential?: CredentialItem;
  methods: MethodOption[];
  onSaved: () => void;
  trigger: React.ReactNode;
}) {
  const { toast } = useToast();
  const editing = Boolean(credential);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [identifier, setIdentifier] = useState(credential?.identifier ?? "");
  const [label, setLabel] = useState(credential?.label ?? "");
  const [methodId, setMethodId] = useState(credential?.methodId ?? NONE);

  async function save() {
    if (!identifier.trim()) {
      toast({ variant: "destructive", title: "ID er påkrevd." });
      return;
    }
    setPending(true);
    try {
      await apiRequest(
        editing ? `/api/credentials/${credential!.id}` : "/api/credentials",
        {
          method: editing ? "PATCH" : "POST",
          body: {
            ...(editing ? {} : { personId }),
            identifier: identifier.trim(),
            label: label || undefined,
            methodId: methodId === NONE ? null : methodId,
          },
        },
      );
      toast({ title: editing ? "Kort/nøkkel oppdatert." : "Kort/nøkkel lagt til." });
      setOpen(false);
      onSaved();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Kunne ikke lagre",
        description: err instanceof ApiError ? err.message : "Ukjent feil.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Rediger kort/nøkkel" : "Nytt kort/nøkkel"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cr-id">ID</Label>
              <Input
                id="cr-id"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="F.eks. ABC123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-label">Navn (valgfritt)</Label>
              <Input
                id="cr-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="F.eks. Ansattkort"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Type (valgfritt)</Label>
            <Select value={methodId} onValueChange={setMethodId}>
              <SelectTrigger>
                <SelectValue placeholder="Velg metode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Ingen</SelectItem>
                {methods.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Knytt kortet til en tilgangsmetode (f.eks. Nøkkelkort) for enklere
              valg når du gir ressurstilgang.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Avbryt
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? "Lagrer…" : "Lagre"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PersonCredentials({
  personId,
  credentials,
  canMutate,
}: {
  personId: string;
  credentials: CredentialItem[];
  canMutate: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [methods, setMethods] = useState<MethodOption[]>([]);

  useEffect(() => {
    if (!canMutate) return;
    apiRequest<MethodOption[]>("/api/access-methods").then(setMethods).catch(() => {});
  }, [canMutate]);

  async function remove(c: CredentialItem) {
    if (
      !confirm(
        `Slette kort/nøkkel «${c.identifier}»? Tidligere tilganger beholder ID-en, men koblingen fjernes.`,
      )
    )
      return;
    try {
      await apiRequest(`/api/credentials/${c.id}`, { method: "DELETE" });
      toast({ title: "Kort/nøkkel slettet." });
      router.refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Kunne ikke slette",
        description: err instanceof ApiError ? err.message : "Ukjent feil.",
      });
    }
  }

  return (
    <div className="space-y-3">
      {credentials.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ingen kort eller nøkler registrert.
        </p>
      ) : (
        <div className="divide-y rounded-md border">
          {credentials.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
              <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-medium">{c.identifier}</span>
                  {c.label && (
                    <span className="text-sm text-muted-foreground">{c.label}</span>
                  )}
                  {c.method && <Badge variant="secondary">{c.method.label}</Badge>}
                  {!c.active && (
                    <Badge variant="outline" className="text-muted-foreground">
                      Inaktiv
                    </Badge>
                  )}
                </div>
                {c._count && c._count.resourceAccesses > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Brukt på {c._count.resourceAccesses} aktiv(e) tilgang(er)
                  </div>
                )}
              </div>
              {canMutate && (
                <>
                  <CredentialDialog
                    personId={personId}
                    credential={c}
                    methods={methods}
                    onSaved={() => router.refresh()}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Rediger">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    aria-label="Slett"
                    onClick={() => remove(c)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {canMutate && (
        <CredentialDialog
          personId={personId}
          methods={methods}
          onSaved={() => router.refresh()}
          trigger={
            <Button variant="outline" size="sm">
              <Plus className="mr-1 h-4 w-4" /> Nytt kort/nøkkel
            </Button>
          }
        />
      )}
    </div>
  );
}
