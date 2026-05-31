"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type AccessMethod = {
  id: string;
  label: string;
  description: string | null;
  requiresCredential: boolean;
  _count?: { accesses: number };
};

function MethodDialog({
  method,
  onSaved,
  trigger,
}: {
  method?: AccessMethod;
  onSaved: () => void;
  trigger: React.ReactNode;
}) {
  const { toast } = useToast();
  const editing = Boolean(method);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [label, setLabel] = useState(method?.label ?? "");
  const [description, setDescription] = useState(method?.description ?? "");
  const [requiresCredential, setRequiresCredential] = useState(
    method?.requiresCredential ?? false,
  );

  async function save() {
    if (!label.trim()) {
      toast({ variant: "destructive", title: "Navn er påkrevd." });
      return;
    }
    setPending(true);
    try {
      await apiRequest(
        editing ? `/api/access-methods/${method!.id}` : "/api/access-methods",
        {
          method: editing ? "PATCH" : "POST",
          body: {
            label: label.trim(),
            description: description || undefined,
            requiresCredential,
          },
        },
      );
      toast({ title: editing ? "Metode oppdatert." : "Metode opprettet." });
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
            {editing ? "Rediger tilgangsmetode" : "Ny tilgangsmetode"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="am-label">Navn</Label>
            <Input
              id="am-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="F.eks. Fysisk nøkkel, App, Nøkkelkort"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="am-desc">Beskrivelse</Label>
            <Textarea
              id="am-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={requiresCredential}
              onCheckedChange={(v) => setRequiresCredential(v === true)}
            />
            Utleverer fysisk nøkkel/kort (krever ID som skal spores)
          </label>
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

export function AccessMethodsManager() {
  const { toast } = useToast();
  const [methods, setMethods] = useState<AccessMethod[]>([]);
  const [loaded, setLoaded] = useState(false);

  function load() {
    apiRequest<AccessMethod[]>("/api/access-methods")
      .then(setMethods)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }
  useEffect(load, []);

  async function remove(method: AccessMethod) {
    if (!confirm(`Slette tilgangsmetoden «${method.label}»?`)) return;
    try {
      await apiRequest(`/api/access-methods/${method.id}`, { method: "DELETE" });
      toast({ title: "Metode slettet." });
      load();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Kunne ikke slette",
        description: err instanceof ApiError ? err.message : "Ukjent feil.",
      });
    }
  }

  if (!loaded) return <p className="text-sm text-muted-foreground">Laster…</p>;

  return (
    <div className="space-y-3">
      <div className="divide-y rounded-md border">
        {methods.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Ingen tilgangsmetoder.
          </p>
        ) : (
          methods.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{m.label}</span>
                  {m.requiresCredential && (
                    <Badge variant="secondary">Sporer ID</Badge>
                  )}
                  {m._count && (
                    <span className="text-xs text-muted-foreground">
                      {m._count.accesses} tilgang(er)
                    </span>
                  )}
                </div>
                {m.description && (
                  <p className="truncate text-sm text-muted-foreground">
                    {m.description}
                  </p>
                )}
              </div>
              <MethodDialog
                method={m}
                onSaved={load}
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
                onClick={() => remove(m)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
      <MethodDialog
        onSaved={load}
        trigger={
          <Button variant="outline" size="sm">
            <Plus className="mr-1 h-4 w-4" /> Ny metode
          </Button>
        }
      />
    </div>
  );
}
