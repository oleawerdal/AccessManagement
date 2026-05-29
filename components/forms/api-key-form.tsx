"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, KeyRound } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api-client";
import { adminRoleLabel } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

export type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  role: "ADMIN" | "AUDITOR";
  active: boolean;
  expiresAt: string | null;
};

export function ApiKeyFormDialog({
  apiKey,
  trigger,
}: {
  apiKey?: ApiKeyRow;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const editing = Boolean(apiKey);

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(apiKey?.name ?? "");
  const [role, setRole] = useState<"ADMIN" | "AUDITOR">(apiKey?.role ?? "ADMIN");
  const [active, setActive] = useState(apiKey?.active ?? true);
  const [expiresAt, setExpiresAt] = useState(
    apiKey?.expiresAt ? apiKey.expiresAt.slice(0, 10) : "",
  );
  // Set after a successful create so we can reveal the token exactly once.
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function resetAndClose() {
    setOpen(false);
    setCreatedToken(null);
    setCopied(false);
    if (!editing) {
      setName("");
      setRole("ADMIN");
      setExpiresAt("");
    }
    router.refresh();
  }

  function onOpenChange(next: boolean) {
    // Refresh the list when closing after a reveal so the new key shows up.
    if (!next && createdToken) {
      resetAndClose();
      return;
    }
    setOpen(next);
  }

  async function onSubmit() {
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Navn er påkrevd." });
      return;
    }
    setPending(true);
    try {
      const expiry = expiresAt ? new Date(expiresAt).toISOString() : null;
      if (editing) {
        await apiRequest(`/api/admin-keys/${apiKey!.id}`, {
          method: "PATCH",
          body: { name: name.trim(), role, active, expiresAt: expiry },
        });
        toast({ title: "API-nøkkel oppdatert." });
        resetAndClose();
      } else {
        const res = await apiRequest<{ token: string }>("/api/admin-keys", {
          method: "POST",
          body: {
            name: name.trim(),
            role,
            ...(expiry ? { expiresAt: expiry } : {}),
          },
        });
        setCreatedToken(res.token);
      }
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

  async function copyToken() {
    if (!createdToken) return;
    try {
      await navigator.clipboard.writeText(createdToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: "destructive", title: "Kunne ikke kopiere." });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <KeyRound className="mr-1 h-4 w-4" /> Ny API-nøkkel
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {createdToken ? (
          <>
            <DialogHeader>
              <DialogTitle>API-nøkkel opprettet</DialogTitle>
              <DialogDescription>
                Kopier nøkkelen nå – den vises kun denne ene gangen og kan ikke
                hentes frem igjen senere.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Nøkkel</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={createdToken}
                  className="font-mono text-xs"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyToken}
                  aria-label="Kopier nøkkel"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-status-valid" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Bruk som <code>Authorization: Bearer &lt;nøkkel&gt;</code> mot
                <code> /api/v1</code>.
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={resetAndClose}>Ferdig</Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Rediger API-nøkkel" : "Ny API-nøkkel"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Navn</Label>
                <Input
                  id="key-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="F.eks. «HR-synk»"
                />
              </div>
              <div className="space-y-2">
                <Label>Rolle</Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as "ADMIN" | "AUDITOR")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(adminRoleLabel).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  ADMIN kan endre data, revisor (AUDITOR) har kun lesetilgang.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="key-expiry">Utløpsdato (valgfri)</Label>
                <Input
                  id="key-expiry"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              {editing && (
                <div className="flex flex-row items-center gap-2">
                  <Checkbox
                    id="key-active"
                    checked={active}
                    onCheckedChange={(v) => setActive(Boolean(v))}
                  />
                  <Label htmlFor="key-active" className="!mt-0">
                    Aktiv
                  </Label>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Avbryt
                </Button>
                <Button onClick={onSubmit} disabled={pending}>
                  {pending ? "Lagrer…" : editing ? "Lagre" : "Opprett"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
