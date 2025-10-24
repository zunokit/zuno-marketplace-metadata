"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Copy, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

interface ApiKeyFormDialogProps {
  onCreate: (data: {
    name: string;
    permissions: Record<string, string[]>;
    metadata?: {
      scopes?: string[];
      notes?: string;
    };
    expiresIn?: number;
    rateLimitEnabled?: boolean;
    rateLimitMax?: number;
    rateLimitTimeWindow?: number;
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

export function ApiKeyFormDialog({
  onCreate,
  isCreating,
  newKey,
  onClose,
}: ApiKeyFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [expiresIn, setExpiresIn] = useState<string>("");
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [copied, setCopied] = useState(false);
  const [enableRateLimit, setEnableRateLimit] = useState(false);
  const [rateLimitMax, setRateLimitMax] = useState<string>("1000");
  const [rateLimitWindow, setRateLimitWindow] = useState<string>("3600"); // 1 hour in seconds

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setName("");
      setNotes("");
      setExpiresIn("");
      setPermissions({});
      setCopied(false);
      setEnableRateLimit(false);
      setRateLimitMax("1000");
      setRateLimitWindow("3600");
      onClose();
    }
  }, [open, onClose]);

  // Show success state when key is created
  useEffect(() => {
    if (newKey) {
      // Keep dialog open to show the key
    }
  }, [newKey]);

  const handlePermissionChange = (resource: string, action: string, checked: boolean) => {
    setPermissions((prev) => {
      const current = prev[resource] || [];
      if (checked) {
        return { ...prev, [resource]: [...current, action] };
      } else {
        return { ...prev, [resource]: current.filter((a) => a !== action) };
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please provide a name for the API key");
      return;
    }

    // Convert permissions to scopes format
    const scopes: string[] = [];
    Object.entries(permissions).forEach(([resource, actions]) => {
      actions.forEach((action) => {
        scopes.push(`${action}:${resource}`);
      });
    });

    onCreate({
      name: name.trim(),
      permissions,
      metadata: {
        scopes,
        notes: notes.trim() || undefined,
      },
      expiresIn: expiresIn ? parseInt(expiresIn) : undefined,
      rateLimitEnabled: enableRateLimit,
      rateLimitMax: enableRateLimit ? parseInt(rateLimitMax) : undefined,
      rateLimitTimeWindow: enableRateLimit ? parseInt(rateLimitWindow) : undefined,
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
                Copy this key now. You won't be able to see it again.
              </DialogDescription>
            </DialogHeader>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Make sure to copy your API key now. You won't be able to see it again!
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
                Create a new API key for programmatic access to the metadata API
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Production API Key"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2">
                <Label>Permissions *</Label>
                <div className="space-y-4 border rounded-lg p-4">
                  {AVAILABLE_RESOURCES.map(({ resource, label, actions }) => (
                    <div key={resource} className="space-y-2">
                      <h4 className="font-medium text-sm">{label}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {actions.map((action) => (
                          <div key={action} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${resource}-${action}`}
                              checked={permissions[resource]?.includes(action) || false}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(resource, action, checked as boolean)
                              }
                              disabled={isCreating}
                            />
                            <Label
                              htmlFor={`${resource}-${action}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {action}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiresIn">Expires In (days)</Label>
                <Input
                  id="expiresIn"
                  type="number"
                  placeholder="Leave empty for no expiration"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  min="1"
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enableRateLimit"
                    checked={enableRateLimit}
                    onCheckedChange={(checked) => setEnableRateLimit(checked as boolean)}
                    disabled={isCreating}
                  />
                  <Label htmlFor="enableRateLimit" className="cursor-pointer">
                    Enable Custom Rate Limiting
                  </Label>
                </div>
                {enableRateLimit && (
                  <div className="grid grid-cols-2 gap-4 pl-6">
                    <div className="space-y-2">
                      <Label htmlFor="rateLimitMax">Max Requests</Label>
                      <Input
                        id="rateLimitMax"
                        type="number"
                        placeholder="1000"
                        value={rateLimitMax}
                        onChange={(e) => setRateLimitMax(e.target.value)}
                        min="1"
                        disabled={isCreating}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rateLimitWindow">
                        Window (seconds)
                      </Label>
                      <Input
                        id="rateLimitWindow"
                        type="number"
                        placeholder="3600"
                        value={rateLimitWindow}
                        onChange={(e) => setRateLimitWindow(e.target.value)}
                        min="1"
                        disabled={isCreating}
                      />
                      <p className="text-xs text-muted-foreground">
                        3600s = 1 hour
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Internal notes about this API key..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  disabled={isCreating}
                />
              </div>

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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
