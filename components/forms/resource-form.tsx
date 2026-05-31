"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resource } from "@prisma/client";

import { apiRequest, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const NONE = "__none__";

type TypeOption = { id: string; label: string };
type RiskOption = { id: string; label: string };
type PersonOption = { id: string; firstName: string; lastName: string };

const schema = z.object({
  name: z.string().min(1, "Navn er påkrevd."),
  description: z.string().optional(),
  typeId: z.string().min(1, "Ressurstype er påkrevd."),
  location: z.string().optional(),
  identifier: z.string().optional(),
  riskLevelId: z.string(),
  ownerPersonId: z.string(),
  active: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export function ResourceFormDialog({
  resource,
  trigger,
}: {
  resource?:
    | (Resource & { riskLevelId?: string | null; ownerPersonId?: string | null })
    | undefined;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [types, setTypes] = useState<TypeOption[]>([]);
  const [risks, setRisks] = useState<RiskOption[]>([]);
  const [persons, setPersons] = useState<PersonOption[]>([]);
  const editing = Boolean(resource);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: resource?.name ?? "",
      description: resource?.description ?? "",
      typeId: resource?.typeId ?? "",
      location: resource?.location ?? "",
      identifier: resource?.identifier ?? "",
      riskLevelId: resource?.riskLevelId ?? NONE,
      ownerPersonId: resource?.ownerPersonId ?? NONE,
      active: resource?.active ?? true,
    },
  });

  useEffect(() => {
    if (!open) return;
    apiRequest<TypeOption[]>("/api/resource-types").then(setTypes).catch(() => {});
    apiRequest<RiskOption[]>("/api/risk-levels").then(setRisks).catch(() => {});
    apiRequest<PersonOption[]>("/api/persons?active=true")
      .then(setPersons)
      .catch(() => {});
  }, [open]);

  async function onSubmit(values: FormValues) {
    try {
      await apiRequest(
        editing ? `/api/resources/${resource!.id}` : "/api/resources",
        {
          method: editing ? "PATCH" : "POST",
          body: {
            name: values.name,
            description: values.description,
            typeId: values.typeId,
            location: values.location,
            identifier: values.identifier,
            riskLevelId:
              values.riskLevelId === NONE ? null : values.riskLevelId,
            ownerPersonId:
              values.ownerPersonId === NONE ? null : values.ownerPersonId,
            active: values.active,
          },
        },
      );
      toast({ title: editing ? "Ressurs oppdatert." : "Ressurs opprettet." });
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
        {trigger ?? <Button>Ny ressurs</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Rediger ressurs" : "Ny ressurs"}</DialogTitle>
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
                    <Input placeholder="F.eks. Hovedinngang, Tjenestebil EL12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="typeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Velg type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {types.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.label}
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
                name="riskLevelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Risikonivå</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Valgfritt" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NONE}>Ingen</SelectItem>
                        {risks.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plassering</FormLabel>
                    <FormControl>
                      <Input placeholder="Bygg A – 1. etasje" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Identifikator</FormLabel>
                    <FormControl>
                      <Input placeholder="Reg.nr / dørnr / asset-ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="ownerPersonId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ansvarlig</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Velg person" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Ingen</SelectItem>
                      {persons.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.firstName} {p.lastName}
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
                {form.formState.isSubmitting ? "Lagrer…" : "Lagre"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
