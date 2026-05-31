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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ResourceOption = { id: string; name: string; type: { label: string } };
type PersonOption = { id: string; firstName: string; lastName: string };
type MethodOption = { id: string; label: string; requiresCredential: boolean };

export function ResourceAccessFormDialog({
  personId,
  resourceId,
  trigger,
}: {
  personId?: string;
  resourceId?: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [persons, setPersons] = useState<PersonOption[]>([]);
  const [resources, setResources] = useState<ResourceOption[]>([]);
  const [methods, setMethods] = useState<MethodOption[]>([]);
  const [selectedPerson, setSelectedPerson] = useState(personId ?? "");
  const [selectedResource, setSelectedResource] = useState(resourceId ?? "");
  const [methodId, setMethodId] = useState("");
  const [credentialId, setCredentialId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    apiRequest<MethodOption[]>("/api/access-methods").then(setMethods).catch(() => {});
    if (!personId) {
      apiRequest<PersonOption[]>("/api/persons?active=true")
        .then(setPersons)
        .catch(() => {});
    }
    if (!resourceId) {
      apiRequest<ResourceOption[]>("/api/resources?active=true")
        .then(setResources)
        .catch(() => {});
    }
  }, [open, personId, resourceId]);

  const selectedMethod = methods.find((m) => m.id === methodId);

  async function onSubmit() {
    setPending(true);
    try {
      await apiRequest("/api/resource-access", {
        method: "POST",
        body: {
          personId: selectedPerson,
          resourceId: selectedResource,
          methodId,
          credentialId: credentialId || undefined,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          notes: notes || undefined,
        },
      });
      toast({ title: "Tilgang gitt." });
      setOpen(false);
      setMethodId("");
      setCredentialId("");
      setExpiresAt("");
      setNotes("");
      router.refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Kunne ikke gi tilgang",
        description: err instanceof ApiError ? err.message : "Ukjent feil.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm">Gi tilgang</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gi fysisk tilgang</DialogTitle>
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
          {!resourceId && (
            <div className="space-y-2">
              <Label>Ressurs</Label>
              <Select value={selectedResource} onValueChange={setSelectedResource}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg ressurs" />
                </SelectTrigger>
                <SelectContent>
                  {resources.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} · {r.type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Tilgangsmetode</Label>
            <Select value={methodId} onValueChange={setMethodId}>
              <SelectTrigger>
                <SelectValue placeholder="Velg metode" />
              </SelectTrigger>
              <SelectContent>
                {methods.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedMethod?.requiresCredential && (
            <div className="space-y-2">
              <Label htmlFor="ra-credential">Kort-/nøkkelnummer</Label>
              <Input
                id="ra-credential"
                value={credentialId}
                onChange={(e) => setCredentialId(e.target.value)}
                placeholder="ID på utlevert kort/nøkkel"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="ra-expiry">Utløpsdato (valgfri)</Label>
            <Input
              id="ra-expiry"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ra-notes">Notat</Label>
            <Textarea
              id="ra-notes"
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
              disabled={pending || !selectedPerson || !selectedResource || !methodId}
            >
              {pending ? "Lagrer…" : "Gi tilgang"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
