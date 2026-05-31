"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { MoreHorizontal, CalendarClock, Ban, KeyRound } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  access: {
    id: string;
    expiresAt: string | Date | null;
    revokedAt: string | Date | null;
    /** Whether a physical credential (key/card) was issued for this access. */
    hasCredential: boolean;
    credentialReturned: boolean;
  };
};

function toDateInput(value: string | Date | null): string {
  if (!value) return "";
  return format(new Date(value), "yyyy-MM-dd");
}

export function ResourceAccessActions({ access }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [renewOpen, setRenewOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [expiresAt, setExpiresAt] = useState(toDateInput(access.expiresAt));
  const [reason, setReason] = useState("");
  const [credentialReturned, setCredentialReturned] = useState(true);

  async function run(fn: () => Promise<unknown>, success: string) {
    setPending(true);
    try {
      await fn();
      toast({ title: success });
      setRenewOpen(false);
      setRevokeOpen(false);
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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Handlinger">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setRenewOpen(true)}>
            <CalendarClock className="h-4 w-4" />
            Forny
          </DropdownMenuItem>
          {access.hasCredential && !access.credentialReturned && (
            <DropdownMenuItem
              onSelect={() =>
                run(
                  () =>
                    apiRequest(`/api/resource-access/${access.id}`, {
                      method: "PATCH",
                      body: { action: "credential-returned", returned: true },
                    }),
                  "Markert som innlevert.",
                )
              }
            >
              <KeyRound className="h-4 w-4" />
              Marker innlevert
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setRevokeOpen(true)}
          >
            <Ban className="h-4 w-4" />
            Revoker
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forny tilgang</DialogTitle>
            <DialogDescription>
              Sett ny utløpsdato. La feltet stå tomt for permanent tilgang.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ra-renew-date">Ny utløpsdato</Label>
            <Input
              id="ra-renew-date"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewOpen(false)} disabled={pending}>
              Avbryt
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    apiRequest(`/api/resource-access/${access.id}`, {
                      method: "PATCH",
                      body: {
                        expiresAt: expiresAt
                          ? new Date(expiresAt).toISOString()
                          : null,
                      },
                    }),
                  "Tilgang fornyet.",
                )
              }
            >
              Lagre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoker tilgang</DialogTitle>
            <DialogDescription>
              Tilgangen markeres som revokert. Dette logges i revisjonsloggen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="ra-revoke-reason">Begrunnelse</Label>
              <Textarea
                id="ra-revoke-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Hvorfor fjernes tilgangen?"
              />
            </div>
            {access.hasCredential && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={credentialReturned}
                  onCheckedChange={(v) => setCredentialReturned(v === true)}
                />
                Fysisk nøkkel/kort er levert tilbake
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeOpen(false)} disabled={pending}>
              Avbryt
            </Button>
            <Button
              variant="destructive"
              disabled={pending || reason.trim().length === 0}
              onClick={() =>
                run(
                  () =>
                    apiRequest(`/api/resource-access/${access.id}/revoke`, {
                      method: "POST",
                      body: {
                        reason,
                        credentialReturned: access.hasCredential
                          ? credentialReturned
                          : undefined,
                      },
                    }),
                  "Tilgang revokert.",
                )
              }
            >
              Revoker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
