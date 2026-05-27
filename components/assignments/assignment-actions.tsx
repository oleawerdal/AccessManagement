"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { MoreHorizontal, CalendarClock, Ban, CheckCircle2 } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  assignment: {
    id: string;
    expiresAt: string | Date | null;
    revokedAt: string | Date | null;
  };
  /** Show the "still required" review action (for expired items). */
  showReview?: boolean;
};

function toDateInput(value: string | Date | null): string {
  if (!value) return "";
  return format(new Date(value), "yyyy-MM-dd");
}

export function AssignmentActions({ assignment, showReview }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [renewOpen, setRenewOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [expiresAt, setExpiresAt] = useState(toDateInput(assignment.expiresAt));
  const [reason, setReason] = useState("");

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
          {showReview && (
            <DropdownMenuItem
              onSelect={() =>
                run(
                  () =>
                    apiRequest(`/api/assignments/${assignment.id}`, {
                      method: "PATCH",
                      body: { action: "review" },
                    }),
                  "Markert som fortsatt nødvendig.",
                )
              }
            >
              <CheckCircle2 className="h-4 w-4" />
              Fortsatt nødvendig
            </DropdownMenuItem>
          )}
          {!assignment.revokedAt && (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setRevokeOpen(true)}
            >
              <Ban className="h-4 w-4" />
              Revoker
            </DropdownMenuItem>
          )}
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
            <Label htmlFor="renew-date">Ny utløpsdato</Label>
            <Input
              id="renew-date"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenewOpen(false)}
              disabled={pending}
            >
              Avbryt
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    apiRequest(`/api/assignments/${assignment.id}`, {
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
          <div className="space-y-2">
            <Label htmlFor="revoke-reason">Begrunnelse</Label>
            <Textarea
              id="revoke-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Hvorfor fjernes tilgangen?"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevokeOpen(false)}
              disabled={pending}
            >
              Avbryt
            </Button>
            <Button
              variant="destructive"
              disabled={pending || reason.trim().length === 0}
              onClick={() =>
                run(
                  () =>
                    apiRequest(`/api/assignments/${assignment.id}/revoke`, {
                      method: "POST",
                      body: { reason },
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
