"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type RoleOption = {
  id: string;
  name: string;
  system: { id: string; name: string };
};

type GroupInitial = {
  id: string;
  name: string;
  description: string | null;
  groupRoles: { roleId: string; defaultExpiryDays: number | null }[];
};

type RoleState = { selected: boolean; expiry: string };

export function GroupFormDialog({
  group,
  trigger,
}: {
  group?: GroupInitial;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const editing = Boolean(group);

  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [state, setState] = useState<Record<string, RoleState>>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    apiRequest<RoleOption[]>("/api/roles")
      .then((rs) => {
        setRoles(rs);
        const init: Record<string, RoleState> = {};
        for (const gr of group?.groupRoles ?? []) {
          init[gr.roleId] = {
            selected: true,
            expiry: gr.defaultExpiryDays ? String(gr.defaultExpiryDays) : "",
          };
        }
        setState(init);
      })
      .catch(() => {});
  }, [open, group]);

  const grouped = roles.reduce<Record<string, RoleOption[]>>((acc, r) => {
    (acc[r.system.name] ??= []).push(r);
    return acc;
  }, {});

  function toggle(roleId: string, checked: boolean) {
    setState((s) => ({
      ...s,
      [roleId]: { selected: checked, expiry: s[roleId]?.expiry ?? "" },
    }));
  }
  function setExpiry(roleId: string, expiry: string) {
    setState((s) => ({
      ...s,
      [roleId]: { selected: s[roleId]?.selected ?? true, expiry },
    }));
  }

  async function onSubmit() {
    setPending(true);
    const selectedRoles = Object.entries(state)
      .filter(([, v]) => v.selected)
      .map(([roleId, v]) => ({
        roleId,
        defaultExpiryDays: v.expiry ? Number(v.expiry) : null,
      }));

    try {
      await apiRequest(editing ? `/api/groups/${group!.id}` : "/api/groups", {
        method: editing ? "PATCH" : "POST",
        body: { name, description: description || undefined, roles: selectedRoles },
      });
      toast({ title: editing ? "Gruppe oppdatert." : "Gruppe opprettet." });
      setOpen(false);
      router.refresh();
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
      <DialogTrigger asChild>
        {trigger ?? <Button>Ny gruppe</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Rediger gruppe" : "Ny gruppe"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Navn</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-desc">Beskrivelse</Label>
            <Textarea
              id="group-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Roller i gruppen</Label>
            {editing && (
              <p className="text-xs text-muted-foreground">
                Endringer i roller synkroniseres til alle medlemmer.
              </p>
            )}
            <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border p-3">
              {Object.entries(grouped).map(([systemName, rs]) => (
                <div key={systemName}>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {systemName}
                  </div>
                  <div className="space-y-1.5">
                    {rs.map((r) => {
                      const st = state[r.id];
                      return (
                        <div key={r.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`role-${r.id}`}
                            checked={st?.selected ?? false}
                            onCheckedChange={(c) => toggle(r.id, Boolean(c))}
                          />
                          <label
                            htmlFor={`role-${r.id}`}
                            className="flex-1 text-sm"
                          >
                            {r.name}
                          </label>
                          <Input
                            type="number"
                            min={1}
                            placeholder="dager"
                            disabled={!st?.selected}
                            value={st?.expiry ?? ""}
                            onChange={(e) => setExpiry(r.id, e.target.value)}
                            className={cn("h-8 w-24", !st?.selected && "opacity-40")}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Tom dagverdi = permanent tilgang.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Avbryt
            </Button>
            <Button onClick={onSubmit} disabled={pending || !name.trim()}>
              {pending ? "Lagrer…" : "Lagre"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
