"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

import { apiRequest } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  auditActionClasses,
  auditActionLabel,
  entityTypeLabel,
} from "@/lib/labels";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AuditAction = keyof typeof auditActionLabel;

type AuditLog = {
  id: string;
  timestamp: string;
  action: AuditAction;
  entityType: string;
  entityLabel: string | null;
  adminEmail: string;
  ipAddress: string | null;
  userAgent: string | null;
  before: unknown;
  after: unknown;
  metadata: unknown;
};

type AdminOption = { id: string; name: string; email: string };

const ALL = "__all__";
const PAGE_SIZE = 50;

export function AuditTable() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const [search, setSearch] = useState("");
  const [action, setAction] = useState(ALL);
  const [entityType, setEntityType] = useState(ALL);
  const [adminUserId, setAdminUserId] = useState(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    apiRequest<AdminOption[]>("/api/admin-users")
      .then(setAdmins)
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    if (search) params.set("search", search);
    if (action !== ALL) params.set("action", action);
    if (entityType !== ALL) params.set("entityType", entityType);
    if (adminUserId !== ALL) params.set("adminUserId", adminUserId);
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(`${to}T23:59:59`).toISOString());
    try {
      const data = await apiRequest<{ items: AuditLog[]; total: number }>(
        `/api/audit?${params.toString()}`,
      );
      setItems(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [page, search, action, entityType, adminUserId, from, to]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  // Reset to first page whenever a filter changes.
  useEffect(() => {
    setPage(1);
  }, [search, action, entityType, adminUserId, from, to]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Søk</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Entitet eller adminbruker…"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Handling</Label>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Alle handlinger</SelectItem>
              {Object.entries(auditActionLabel).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Entitet</Label>
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Alle entiteter</SelectItem>
              {Object.entries(entityTypeLabel).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Adminbruker</Label>
          <Select value={adminUserId} onValueChange={setAdminUserId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Alle brukere</SelectItem>
              {admins.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Fra dato</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Til dato</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">Tidspunkt</TableHead>
              <TableHead className="w-32">Handling</TableHead>
              <TableHead>Entitet</TableHead>
              <TableHead>Adminbruker</TableHead>
              <TableHead className="w-32">IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  Laster…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  Ingen logginnslag funnet.
                </TableCell>
              </TableRow>
            ) : (
              items.map((log) => (
                <TableRow
                  key={log.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(log)}
                >
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {format(new Date(log.timestamp), "dd.MM.yyyy HH:mm:ss", {
                      locale: nb,
                    })}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium",
                        auditActionClasses[log.action],
                      )}
                    >
                      {auditActionLabel[log.action]}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="text-muted-foreground">
                      {entityTypeLabel[log.entityType] ?? log.entityType}:{" "}
                    </span>
                    {log.entityLabel ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{log.adminEmail}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.ipAddress ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} innslag</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Forrige
          </Button>
          <span>
            Side {page} av {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Neste
          </Button>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {auditActionLabel[selected.action]} ·{" "}
                  {entityTypeLabel[selected.entityType] ?? selected.entityType}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <Detail label="Tidspunkt" value={format(new Date(selected.timestamp), "PPpp", { locale: nb })} />
                  <Detail label="Adminbruker" value={selected.adminEmail} />
                  <Detail label="Entitet" value={selected.entityLabel ?? "—"} />
                  <Detail label="IP-adresse" value={selected.ipAddress ?? "—"} />
                </div>
                {selected.userAgent && (
                  <Detail label="User-agent" value={selected.userAgent} />
                )}
                <JsonBlock label="Metadata" value={selected.metadata} />
                <JsonBlock label="Før" value={selected.before} />
                <JsonBlock label="Etter" value={selected.after} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="break-words">{value}</div>
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  if (value == null) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-muted-foreground">{label}</div>
      <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
