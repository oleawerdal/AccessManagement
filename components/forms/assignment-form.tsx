"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RoleOption = {
  id: string;
  name: string;
  system: { id: string; name: string };
};
type PersonOption = { id: string; firstName: string; lastName: string };

export function AssignmentFormDialog({
  personId,
  trigger,
}: {
  personId?: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [persons, setPersons] = useState<PersonOption[]>([]);
  const [selectedPerson, setSelectedPerson] = useState(personId ?? "");
  const [roleId, setRoleId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    apiRequest<RoleOption[]>("/api/roles").then(setRoles).catch(() => {});
    if (!personId) {
      apiRequest<PersonOption[]>("/api/persons?active=true")
        .then(setPersons)
        .catch(() => {});
    }
  }, [open, personId]);

  // Group roles by system for the picker.
  const grouped = roles.reduce<Record<string, RoleOption[]>>((acc, r) => {
    (acc[r.system.name] ??= []).push(r);
    return acc;
  }, {});

  async function onSubmit() {
    setPending(true);
    try {
      await apiRequest("/api/assignments", {
        method: "POST",
        body: {
          personId: selectedPerson,
          roleId,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          notes: notes || undefined,
        },
      });
      toast({ title: "Rolle tildelt." });
      setOpen(false);
      setRoleId("");
      setExpiresAt("");
      setNotes("");
      router.refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Kunne ikke tildele",
        description: err instanceof ApiError ? err.message : "Ukjent feil.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm">Tildel rolle</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tildel rolle (direkte)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!personId && (
            <div className="space-y-2">
              <Label>Person</Label>
              <Select value={selectedPerson} onValueChange={setSelectedPerson}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg person" />
                </SelectTrigger>
                <SelectContent>
                  {persons.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.firstName} {p.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Rolle</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Velg rolle" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(grouped).map(([systemName, rs]) => (
                  <SelectGroup key={systemName}>
                    <SelectLabel>{systemName}</SelectLabel>
                    {rs.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assign-expiry">Utløpsdato (valgfri)</Label>
            <Input
              id="assign-expiry"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assign-notes">Notat</Label>
            <Textarea
              id="assign-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Avbryt
            </Button>
            <Button
              onClick={onSubmit}
              disabled={pending || !selectedPerson || !roleId}
            >
              {pending ? "Tildeler…" : "Tildel"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
