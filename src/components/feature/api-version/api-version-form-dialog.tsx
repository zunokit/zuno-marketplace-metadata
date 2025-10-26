"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCreateApiVersion } from "@/hooks/use-api-versions";
import { Plus } from "lucide-react";

const formSchema = z.object({
  id: z.string().min(1, "Version ID is required").max(32),
  label: z.string().min(1, "Label is required").max(32),
  isCurrent: z.boolean().default(false),
  releasedAt: z.string().min(1, "Release date is required"),
  sunsetAt: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function ApiVersionFormDialog() {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateApiVersion();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: "",
      label: "",
      isCurrent: false,
      releasedAt: new Date().toISOString().split("T")[0],
      sunsetAt: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    await createMutation.mutateAsync({
      id: data.id,
      label: data.label,
      isCurrent: data.isCurrent,
      releasedAt: new Date(data.releasedAt),
      ...(data.sunsetAt && { sunsetAt: new Date(data.sunsetAt) }),
    });

    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Version
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create API Version</DialogTitle>
          <DialogDescription>
            Add a new API version to the system. This will be used for versioning IPFS uploads.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Version ID</FormLabel>
                  <FormControl>
                    <Input placeholder="v1, v2, 1.0.0" {...field} />
                  </FormControl>
                  <FormDescription>
                    Unique identifier (e.g., v1, v2, 1.0.0)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input placeholder="Version 1.0" {...field} />
                  </FormControl>
                  <FormDescription>
                    Human-friendly display name
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isCurrent"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Set as Current</FormLabel>
                    <FormDescription>
                      This will be used for new IPFS uploads
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="releasedAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Release Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sunsetAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sunset Date (Optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>
                    When this version will be deprecated
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
