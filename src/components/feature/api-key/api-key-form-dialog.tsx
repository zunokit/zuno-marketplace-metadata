"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import ms, { StringValue } from "ms";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Copy, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ApiKeyFormDialogProps {
  onCreate: (data: {
    name: string;
    permissions: Record<string, string[]>;
    metadata?: {
      scopes?: string[];
      notes?: string;
    };
    rateLimitEnabled?: boolean;
    rateLimitMax?: number;
    rateLimitTimeWindow?: number;
    expiresIn?: number;
  }) => void;
  isCreating: boolean;
  newKey?: string | null;
  onClose: () => void;
}

const AVAILABLE_RESOURCES = [
  {
    resource: "metadata",
    label: "Metadata",
    actions: ["read", "list", "write", "delete"],
  },
  {
    resource: "media",
    label: "Media",
    actions: ["read", "list", "write", "delete"],
  },
];

// Form schema with zod validation
const apiKeyFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(100),
  permissions: z.record(z.string(), z.array(z.string())).refine((perms) => {
    const values = Object.values(perms) as string[][];
    return (
      Object.keys(perms).length > 0 &&
      values.some((actions) => actions.length > 0)
    );
  }, "At least one permission must be selected"),
  expiresIn: z
    .string()
    .optional()
    .refine(
      (val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 365),
      "Expiration must be between 1 and 365 days"
    ),
  rateLimitEnabled: z.boolean().optional(),
  rateLimitMax: z
    .string()
    .optional()
    .refine(
      (val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 10000),
      "Max requests must be between 1 and 10000"
    ),
  rateLimitTimeWindow: z
    .string()
    .optional()
    .refine(
      (val) => !val || (parseInt(val) >= 1 && parseInt(val) <= 86400),
      "Time window must be between 1 and 86400 seconds (24 hours)"
    ),
  notes: z
    .string()
    .max(500, "Notes must be less than 500 characters")
    .optional(),
});

type ApiKeyFormValues = z.infer<typeof apiKeyFormSchema>;

export function ApiKeyFormDialog({
  onCreate,
  isCreating,
  newKey,
  onClose,
}: ApiKeyFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const form = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: {
      name: "",
      permissions: {},
      expiresIn: "",
      rateLimitEnabled: false,
      rateLimitMax: "",
      rateLimitTimeWindow: "",
      notes: "",
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setCopied(false);
      onClose();
    }
  }, [open, form, onClose]);

  const handlePermissionChange = (
    resource: string,
    action: string,
    checked: boolean
  ) => {
    const currentPermissions = form.getValues("permissions");
    const currentActions = currentPermissions[resource] || [];

    const updatedActions = checked
      ? [...currentActions, action]
      : currentActions.filter((a) => a !== action);

    form.setValue("permissions", {
      ...currentPermissions,
      [resource]: updatedActions,
    });

    // Trigger validation
    form.trigger("permissions");
  };

  const onSubmit = (values: ApiKeyFormValues) => {
    // Convert permissions to scopes format
    const scopes: string[] = [];
    Object.entries(values.permissions).forEach(([resource, actions]) => {
      actions.forEach((action) => {
        scopes.push(`${resource}:${action}`);
      });
    });

    // Type-safe permissions (zod already validates this is Record<string, string[]>)
    const permissions: Record<string, string[]> = {};
    Object.entries(values.permissions).forEach(([key, value]) => {
      permissions[key] = value;
    });

    // Convert days to seconds using ms library
    const expiresInSeconds = values.expiresIn
      ? Math.floor(ms(`${values.expiresIn}d` as StringValue) / 1000) // Convert ms to seconds
      : undefined;

    onCreate({
      name: values.name.trim(),
      permissions,
      metadata: {
        scopes,
        notes: values.notes?.trim() || undefined,
      },
      expiresIn: expiresInSeconds,
      rateLimitEnabled: values.rateLimitEnabled,
      rateLimitMax: values.rateLimitMax ? parseInt(values.rateLimitMax) : undefined,
      rateLimitTimeWindow: values.rateLimitTimeWindow ? parseInt(values.rateLimitTimeWindow) : undefined,
    });
  };

  const handleCopyKey = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      toast.success("API key copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCloseAfterCreation = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {newKey ? (
          // Show created key
          <>
            <DialogHeader>
              <DialogTitle>API Key Created Successfully!</DialogTitle>
              <DialogDescription>
                Copy this key now. You won&apos;t be able to see it again.
              </DialogDescription>
            </DialogHeader>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Make sure to copy your API key now. You won&apos;t be able to
                see it again!
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label>API Key</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newKey}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyKey}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleCloseAfterCreation}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          // Show creation form
          <>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Create a new API key for programmatic access to the metadata
                API. Rate limiting is configured server-side (1000 req/hour by
                default).
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Production API Key"
                          disabled={isCreating}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        A descriptive name for this API key
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="permissions"
                  render={() => (
                    <FormItem>
                      <FormLabel>Permissions *</FormLabel>
                      <div className="space-y-4 border rounded-lg p-4">
                        {AVAILABLE_RESOURCES.map(
                          ({ resource, label, actions }) => (
                            <div key={resource} className="space-y-2">
                              <h4 className="font-medium text-sm">{label}</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {actions.map((action) => (
                                  <div
                                    key={action}
                                    className="flex items-center space-x-2"
                                  >
                                    <Checkbox
                                      id={`${resource}-${action}`}
                                      checked={(
                                        form.watch("permissions")[resource] ||
                                        []
                                      ).includes(action)}
                                      onCheckedChange={(checked) =>
                                        handlePermissionChange(
                                          resource,
                                          action,
                                          checked as boolean
                                        )
                                      }
                                      disabled={isCreating}
                                    />
                                    <label
                                      htmlFor={`${resource}-${action}`}
                                      className="text-sm font-normal cursor-pointer"
                                    >
                                      {action}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                      <FormDescription>
                        Select the permissions this API key will have
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expiresIn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expires In (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Leave empty for no expiration"
                          min="1"
                          max="3650"
                          disabled={isCreating}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of days until the key expires (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rateLimitEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isCreating}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enable Rate Limiting</FormLabel>
                        <FormDescription>
                          Limit the number of requests this key can make
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {form.watch("rateLimitEnabled") && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="rateLimitMax"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Requests</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="1000"
                              min="1"
                              max="10000"
                              disabled={isCreating}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Maximum requests allowed
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="rateLimitTimeWindow"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time Window (seconds)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="3600"
                              min="1"
                              max="86400"
                              disabled={isCreating}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Time window in seconds (1 hour = 3600)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Internal notes about this API key..."
                          rows={3}
                          disabled={isCreating}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional notes for internal reference
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
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? "Creating..." : "Create API Key"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
