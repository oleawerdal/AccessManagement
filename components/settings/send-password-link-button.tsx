"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

// Sends a "set / reset password" e-mail link to the given admin user.
export function SendPasswordLinkButton({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      const res = await apiRequest<{ to: string }>(
        `/api/admin-users/${userId}/send-password-link`,
        { method: "POST" },
      );
      toast({ title: "Passord-lenke sendt.", description: `Til ${res.to}` });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Kunne ikke sende",
        description: err instanceof ApiError ? err.message : "Ukjent feil.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      aria-label="Send passord-lenke"
      title="Send passord-lenke"
      onClick={onClick}
      disabled={pending}
    >
      <Mail className="h-4 w-4" />
    </Button>
  );
}
