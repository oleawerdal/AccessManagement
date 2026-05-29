"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { apiRequest, ApiError } from "@/lib/api-client";
import { adminRoleLabel } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "AUDITOR";
  active: boolean;
};

const schema = z.object({
  email: z.string().email("Ugyldig e-postadresse."),
  name: z.string().min(1, "Navn er påkrevd."),
  password: z.string().optional(),
  role: z.enum(["ADMIN", "AUDITOR"]),
  active: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export function AdminUserFormDialog({
  user,
  trigger,
}: {
  user?: AdminUser;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  // New users are invited by e-mail by default; this opts into setting a
  // password manually instead (e.g. when e-mail is not configured).
  const [manualPassword, setManualPassword] = useState(false);
  const editing = Boolean(user);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: user?.email ?? "",
      name: user?.name ?? "",
      password: "",
      role: user?.role ?? "ADMIN",
      active: user?.active ?? true,
    },
  });

  async function onSubmit(values: FormValues) {
    const wantsPassword = editing || manualPassword;
    if (wantsPassword && values.password && values.password.length < 8) {
      form.setError("password", { message: "Minst 8 tegn." });
      return;
    }
    if (!editing && manualPassword && !values.password) {
      form.setError("password", { message: "Skriv inn et passord (minst 8 tegn)." });
      return;
    }

    try {
      if (editing) {
        await apiRequest(`/api/admin-users/${user!.id}`, {
          method: "PATCH",
          body: {
            name: values.name,
            role: values.role,
            active: values.active,
            password: values.password || undefined,
          },
        });
        toast({ title: "Bruker oppdatert." });
      } else {
        const res = await apiRequest<{ emailSent?: boolean; emailError?: string }>(
          "/api/admin-users",
          {
            method: "POST",
            body: {
              email: values.email,
              name: values.name,
              role: values.role,
              active: values.active,
              // Omit password to trigger an e-mail invitation.
              password: manualPassword ? values.password : undefined,
            },
          },
        );
        if (manualPassword) {
          toast({ title: "Bruker opprettet." });
        } else if (res.emailSent) {
          toast({
            title: "Invitasjon sendt.",
            description: `${values.email} kan nå sette passordet sitt.`,
          });
        } else {
          toast({
            variant: "destructive",
            title: "Bruker opprettet, men invitasjon ble ikke sendt",
            description:
              (res.emailError ?? "E-post feilet.") +
              " Send passord-lenke på nytt fra listen, eller sjekk SMTP.",
          });
        }
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Kunne ikke lagre",
        description: err instanceof ApiError ? err.message : "Ukjent feil.",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button>Ny adminbruker</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Rediger adminbruker" : "Ny adminbruker"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-post</FormLabel>
                  <FormControl>
                    <Input type="email" disabled={editing} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Navn</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!editing && (
              <div className="flex flex-row items-center gap-2">
                <Checkbox
                  id="manual-password"
                  checked={manualPassword}
                  onCheckedChange={(v) => setManualPassword(Boolean(v))}
                />
                <label htmlFor="manual-password" className="text-sm">
                  Sett passord manuelt (ellers sendes en invitasjon på e-post)
                </label>
              </div>
            )}

            {(editing || manualPassword) && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {editing ? "Nytt passord (valgfritt)" : "Passord"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rolle</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(adminRoleLabel).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Aktiv</FormLabel>
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Avbryt
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Lagrer…"
                  : editing
                    ? "Lagre"
                    : manualPassword
                      ? "Opprett"
                      : "Opprett og inviter"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
