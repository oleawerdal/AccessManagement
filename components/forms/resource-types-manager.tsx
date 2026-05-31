"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ResourceType = {
  id: string;
  label: string;
  description: string | null;
  icon: string | null;
  _count?: { resources: number };
};

function TypeDialog({
  type,
  onSaved,
  trigger,
}: {
  type?: ResourceType;
  onSaved: () => void;
  trigger: React.ReactNode;
}) {
  const { toast } = useToast();
  const editing = Boolean(type);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [label, setLabel] = useState(type?.label ?? "");
  const [description, setDescription] = useState(type?.description ?? "");

  async function save() {
    if (!label.trim()) {
      toast({ variant: "destructive", title: "Navn er påkrevd." });
      return;
    }
    setPending(true);
    try {
      await apiRequest(
        editing ? `/api/resource-types/${type!.id}` : "/api/resource-types",
        {
          method: editing ? "PATCH" : "POST",
          body: { label: label.trim(), description: description || undefined },
        },
      );
      toast({ title: editing ? "Type oppdatert." : "Type opprettet." });
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
          <DialogTitle>{editing ? "Rediger ressurstype" : "Ny ressurstype"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rt-label">Navn</Label>
            <Input
              id="rt-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="F.eks. Dør, Port, Bil"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rt-desc">Beskrivelse</Label>
            <Textarea
              id="rt-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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

export function ResourceTypesManager() {
  const { toast } = useToast();
  const [types, setTypes] = useState<ResourceType[]>([]);
  const [loaded, setLoaded] = useState(false);

  function load() {
    apiRequest<ResourceType[]>("/api/resource-types")
      .then(setTypes)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }
  useEffect(load, []);

  async function remove(type: ResourceType) {
    if (!confirm(`Slette ressurstypen «${type.label}»?`)) return;
    try {
      await apiRequest(`/api/resource-types/${type.id}`, { method: "DELETE" });
      toast({ title: "Type slettet." });
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
        {types.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Ingen ressurstyper.
          </p>
        ) : (
          types.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.label}</span>
                  {t._count && (
                    <span className="text-xs text-muted-foreground">
                      {t._count.resources} ressurs(er)
                    </span>
                  )}
                </div>
                {t.description && (
                  <p className="truncate text-sm text-muted-foreground">
                    {t.description}
                  </p>
                )}
              </div>
              <TypeDialog
                type={t}
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
                onClick={() => remove(t)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
      <TypeDialog
        onSaved={load}
        trigger={
          <Button variant="outline" size="sm">
            <Plus className="mr-1 h-4 w-4" /> Ny type
          </Button>
        }
      />
    </div>
  );
}
