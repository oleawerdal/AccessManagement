"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      // Always succeeds (the API never reveals whether the account exists).
      await apiRequest("/api/auth/request-password-reset", {
        method: "POST",
        body: { email },
      });
    } catch {
      // ignore — still show the neutral confirmation
    } finally {
      setPending(false);
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-status-valid" />
        <p className="text-sm text-muted-foreground">
          Hvis adressen tilhører en konto, har vi sendt en e-post med en lenke
          for å tilbakestille passordet.
        </p>
        <Link href="/login" className="text-sm text-primary hover:underline">
          Tilbake til innlogging
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-post</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="navn@example.com"
          required
          autoFocus
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sender…" : "Send lenke for tilbakestilling"}
      </Button>
      <div className="text-center">
        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
          Tilbake til innlogging
        </Link>
      </div>
    </form>
  );
}
