"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { apiRequest, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

type RoleLite = {
  id: string;
  name: string;
  description: string | null;
  riskLevelId: string;
};

type RiskLevelOption = {
  id: string;
  label: string;
  description: string | null;
  color: string;
  severity: number;
};

const schema = z.object({
  name: z.string().min(1, "Navn er påkrevd."),
  description: z.string().optional(),
  riskLevelId: z.string().min(1, "Risikonivå er påkrevd."),
});
type FormValues = z.infer<typeof schema>;

export function RoleFormDialog({
  systemId,
  role,
  trigger,
}: {
  systemId: string;
  role?: RoleLite;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [levels, setLevels] = useState<RiskLevelOption[]>([]);
  const editing = Boolean(role);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: role?.name ?? "",
      description: role?.description ?? "",
      riskLevelId: role?.riskLevelId ?? "",
    },
  });

  useEffect(() => {
    if (!open) return;
    apiRequest<RiskLevelOption[]>("/api/risk-levels")
      .then((data) => {
        setLevels(data);
        // Preselect a default level when creating a new role.
        if (!role && !form.getValues("riskLevelId") && data.length > 0) {
          form.setValue("riskLevelId", data[0].id);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selected = levels.find((l) => l.id === form.watch("riskLevelId"));

  async function onSubmit(values: FormValues) {
    try {
      await apiRequest(editing ? `/api/roles/${role!.id}` : "/api/roles", {
        method: editing ? "PATCH" : "POST",
        body: editing ? values : { ...values, systemId },
      });
      toast({ title: editing ? "Rolle oppdatert." : "Rolle opprettet." });
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
        {trigger ?? <Button size="sm">Ny rolle</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Rediger rolle" : "Ny rolle"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            <FormField
              control={form.control}
              name="riskLevelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Risikonivå</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Velg nivå" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {levels.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: l.color }}
                            />
                            {l.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selected?.description && (
                    <p className="text-xs text-muted-foreground">
                      {selected.description}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beskrivelse</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
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
                {form.formState.isSubmitting ? "Lagrer…" : "Lagre"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
