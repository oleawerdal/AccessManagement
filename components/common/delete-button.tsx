"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DeleteButton({
  url,
  resourceLabel,
  redirectTo,
  trigger,
  successMessage = "Slettet.",
}: {
  url: string;
  resourceLabel: string;
  redirectTo?: string;
  trigger?: React.ReactNode;
  successMessage?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function onDelete() {
    setPending(true);
    try {
      await apiRequest(url, { method: "DELETE" });
      toast({ title: successMessage });
      setOpen(false);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Kunne ikke slette",
        description: err instanceof ApiError ? err.message : "Ukjent feil.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)}>
        {trigger ?? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            aria-label="Slett"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </span>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Slette {resourceLabel}?</DialogTitle>
          <DialogDescription>
            Dette kan ikke angres. Tilknyttede data fjernes også.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Avbryt
          </Button>
          <Button variant="destructive" onClick={onDelete} disabled={pending}>
            {pending ? "Sletter…" : "Slett"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
