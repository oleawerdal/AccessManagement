"use client";

import { useEffect, useState } from "react";
import { Save, Copy, Check } from "lucide-react";

import { apiRequest, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";

type Settings = {
  enabled: boolean;
  clientId: string | null;
  issuer: string | null;
  hasClientSecret: boolean;
};

export function SsoSettingsForm() {
  const { toast } = useToast();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [clientId, setClientId] = useState("");
  const [issuer, setIssuer] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [hasSecret, setHasSecret] = useState(false);
  const [redirectUri, setRedirectUri] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setRedirectUri(
      `${window.location.origin}/api/auth/callback/microsoft-entra-id`,
    );
    apiRequest<Settings | null>("/api/sso-settings")
      .then((s) => {
        if (s) {
          setEnabled(s.enabled);
          setClientId(s.clientId ?? "");
          setIssuer(s.issuer ?? "");
          setHasSecret(s.hasClientSecret);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await apiRequest("/api/sso-settings", {
        method: "PUT",
        body: {
          enabled,
          clientId: clientId || undefined,
          issuer: issuer || undefined,
          // Empty keeps the stored secret.
          clientSecret: clientSecret || undefined,
        },
      });
      if (clientSecret) setHasSecret(true);
      setClientSecret("");
      toast({ title: "SSO-innstillinger lagret." });
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

  async function copyRedirect() {
    try {
      await navigator.clipboard.writeText(redirectUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  if (!loaded) {
    return <p className="text-sm text-muted-foreground">Laster…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Checkbox
          id="sso-enabled"
          checked={enabled}
          onCheckedChange={(v) => setEnabled(Boolean(v))}
        />
        <Label htmlFor="sso-enabled" className="!mt-0">
          Aktiver innlogging med Microsoft (Entra ID)
        </Label>
      </div>

      <div className="space-y-2">
        <Label>Redirect-URI (registrer i Entra)</Label>
        <div className="flex items-center gap-2">
          <Input readOnly value={redirectUri} className="font-mono text-xs" />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={copyRedirect}
            aria-label="Kopier redirect-URI"
          >
            {copied ? (
              <Check className="h-4 w-4 text-status-valid" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sso-client-id">Application (client) ID</Label>
          <Input
            id="sso-client-id"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sso-secret">Client secret</Label>
          <Input
            id="sso-secret"
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            autoComplete="new-password"
            placeholder={hasSecret ? "•••••••• (uendret)" : ""}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="sso-issuer">Issuer-URL</Label>
          <Input
            id="sso-issuer"
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            placeholder="https://login.microsoftonline.com/<tenant-id>/v2.0"
          />
        </div>
      </div>

      <div className="pt-1">
        <Button onClick={save} disabled={saving}>
          <Save className="mr-1 h-4 w-4" />
          {saving ? "Lagrer…" : "Lagre"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Brukere må være opprettet på forhånd (samme e-post som i Entra) — SSO
        oppretter ikke nye kontoer. Endringer kan ta opptil ~30 sekunder å slå
        inn. «Logg inn med Microsoft» vises på innloggingssiden når dette er
        aktivert.
      </p>
    </div>
  );
}
