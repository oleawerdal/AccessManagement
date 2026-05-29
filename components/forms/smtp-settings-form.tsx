"use client";

import { useEffect, useState } from "react";
import { Send, Save } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";

type Settings = {
  host: string;
  port: number;
  secure: boolean;
  username: string | null;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
  hasPassword: boolean;
};

export function SmtpSettingsForm() {
  const { toast } = useToast();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [secure, setSecure] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [fromName, setFromName] = useState("Tilgangsstyring");
  const [fromEmail, setFromEmail] = useState("");

  useEffect(() => {
    apiRequest<Settings | null>("/api/smtp-settings")
      .then((s) => {
        if (s) {
          setEnabled(s.enabled);
          setHost(s.host);
          setPort(String(s.port));
          setSecure(s.secure);
          setUsername(s.username ?? "");
          setFromName(s.fromName);
          setFromEmail(s.fromEmail);
          setHasPassword(s.hasPassword);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await apiRequest("/api/smtp-settings", {
        method: "PUT",
        body: {
          host,
          port: Number(port),
          secure,
          username: username || undefined,
          // Empty keeps the stored password.
          password: password || undefined,
          fromName,
          fromEmail,
          enabled,
        },
      });
      if (password) setHasPassword(true);
      setPassword("");
      toast({ title: "SMTP-innstillinger lagret." });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Kunne ikke lagre",
        description: err instanceof ApiError ? err.message : "Ukjent feil.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    try {
      const res = await apiRequest<{ to: string }>("/api/smtp-settings/test", {
        method: "POST",
      });
      toast({ title: "Test-e-post sendt.", description: `Til ${res.to}` });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Test feilet",
        description: err instanceof ApiError ? err.message : "Ukjent feil.",
      });
    } finally {
      setTesting(false);
    }
  }

  if (!loaded) {
    return <p className="text-sm text-muted-foreground">Laster…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Checkbox
          id="smtp-enabled"
          checked={enabled}
          onCheckedChange={(v) => setEnabled(Boolean(v))}
        />
        <Label htmlFor="smtp-enabled" className="!mt-0">
          Aktiver e-postutsending
        </Label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="smtp-host">SMTP-vert</Label>
          <Input
            id="smtp-host"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="mail.smtp2go.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-port">Port</Label>
          <Input
            id="smtp-port"
            type="number"
            value={port}
            onChange={(e) => setPort(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 pt-7">
          <Checkbox
            id="smtp-secure"
            checked={secure}
            onCheckedChange={(v) => setSecure(Boolean(v))}
          />
          <Label htmlFor="smtp-secure" className="!mt-0">
            TLS/SSL (port 465)
          </Label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-username">Brukernavn</Label>
          <Input
            id="smtp-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-password">Passord</Label>
          <Input
            id="smtp-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder={hasPassword ? "•••••••• (uendret)" : ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-from-name">Avsendernavn</Label>
          <Input
            id="smtp-from-name"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-from-email">Avsenderadresse</Label>
          <Input
            id="smtp-from-email"
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder="ingen-svar@example.com"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button onClick={save} disabled={saving}>
          <Save className="mr-1 h-4 w-4" />
          {saving ? "Lagrer…" : "Lagre"}
        </Button>
        <Button variant="outline" onClick={sendTest} disabled={testing}>
          <Send className="mr-1 h-4 w-4" />
          {testing ? "Sender…" : "Send test-e-post"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Test-e-posten sendes til din egen adresse. Lagre før du tester.
      </p>
    </div>
  );
}
