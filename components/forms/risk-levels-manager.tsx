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

type RiskLevel = {
  id: string;
  label: string;
  description: string | null;
  color: string;
  severity: number;
};

function LevelDialog({
  level,
  onSaved,
  trigger,
}: {
  level?: RiskLevel;
  onSaved: () => void;
  trigger: React.ReactNode;
}) {
  const { toast } = useToast();
  const editing = Boolean(level);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [label, setLabel] = useState(level?.label ?? "");
  const [color, setColor] = useState(level?.color ?? "#3b82f6");
  const [severity, setSeverity] = useState(String(level?.severity ?? 0));
  const [description, setDescription] = useState(level?.description ?? "");

  async function save() {
    if (!label.trim()) {
      toast({ variant: "destructive", title: "Navn er påkrevd." });
      return;
    }
    setPending(true);
    try {
      await apiRequest(editing ? `/api/risk-levels/${level!.id}` : "/api/risk-levels", {
        method: editing ? "PATCH" : "POST",
        body: {
          label: label.trim(),
          color,
          severity: Number(severity) || 0,
          description: description || undefined,
        },
      });
      toast({ title: editing ? "Nivå oppdatert." : "Nivå opprettet." });
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
          <DialogTitle>{editing ? "Rediger risikonivå" : "Nytt risikonivå"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_auto_auto] gap-3">
            <div className="space-y-2">
              <Label htmlFor="rl-label">Navn</Label>
              <Input id="rl-label" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rl-color">Farge</Label>
              <Input
                id="rl-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-14 p-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rl-sev">Rang</Label>
              <Input
                id="rl-sev"
                type="number"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-20"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rl-desc">Beskrivelse</Label>
            <Textarea
              id="rl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            «Rang» bestemmer rekkefølge/alvorlighet (høyere = mer risikabelt).
          </p>
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

export function RiskLevelsManager() {
  const { toast } = useToast();
  const [levels, setLevels] = useState<RiskLevel[]>([]);
  const [loaded, setLoaded] = useState(false);

  function load() {
    apiRequest<RiskLevel[]>("/api/risk-levels")
      .then(setLevels)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }
  useEffect(load, []);

  async function remove(level: RiskLevel) {
    if (!confirm(`Slette risikonivået «${level.label}»?`)) return;
    try {
      await apiRequest(`/api/risk-levels/${level.id}`, { method: "DELETE" });
      toast({ title: "Nivå slettet." });
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
        {levels.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Ingen risikonivåer.
          </p>
        ) : (
          levels.map((l) => (
            <div key={l.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: l.color }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{l.label}</span>
                  <span className="text-xs text-muted-foreground">rang {l.severity}</span>
                </div>
                {l.description && (
                  <p className="truncate text-sm text-muted-foreground">{l.description}</p>
                )}
              </div>
              <LevelDialog
                level={l}
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
                onClick={() => remove(l)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
      <LevelDialog
        onSaved={load}
        trigger={
          <Button variant="outline" size="sm">
            <Plus className="mr-1 h-4 w-4" /> Nytt nivå
          </Button>
        }
      />
    </div>
  );
}
