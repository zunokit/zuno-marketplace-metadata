"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ApiKeyViewModel } from "@/hooks/use-api-keys";

interface ApiKeyViewDialogProps {
  apiKey: ApiKeyViewModel | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ApiKeyViewDialog({
  apiKey,
  isOpen,
  onClose,
}: ApiKeyViewDialogProps) {
  if (!apiKey) return null;

  const isExpired = apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>API Key Details</DialogTitle>
          <DialogDescription>
            View information about this API key
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Name</h3>
              <span>{apiKey.name}</span>
            </div>
            <Separator />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Status</h3>
              <Badge variant={apiKey.enabled ? "default" : "secondary"}>
                {apiKey.enabled ? "Active" : "Disabled"}
              </Badge>
            </div>
            <Separator />
          </div>

          {/* Permissions */}
          <div className="space-y-2">
            <h3 className="font-medium">Permissions</h3>
            {Object.keys(apiKey.permissions).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(apiKey.permissions).map(([resource, actions]) => (
                  <div
                    key={resource}
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <span className="font-medium capitalize">{resource}</span>
                    <div className="flex gap-1">
                      {(actions as string[]).map((action) => (
                        <Badge key={action} variant="outline" className="text-xs">
                          {action}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No permissions assigned
              </p>
            )}
            <Separator />
          </div>

          {/* Scopes */}
          {apiKey.scopes && apiKey.scopes.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Scopes</h3>
              <div className="flex flex-wrap gap-1">
                {apiKey.scopes.map((scope, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {scope}
                  </Badge>
                ))}
              </div>
              <Separator />
            </div>
          )}

          {/* Rate Limiting */}
          {apiKey.rateLimitEnabled && (
            <div className="space-y-2">
              <h3 className="font-medium">Rate Limiting</h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Max Requests:</span>
                  <span className="font-medium">{apiKey.rateLimitMax || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Window:</span>
                  <span className="font-medium">
                    {apiKey.rateLimitTimeWindow
                      ? `${apiKey.rateLimitTimeWindow}s (${Math.floor(apiKey.rateLimitTimeWindow / 3600)}h)`
                      : "N/A"}
                  </span>
                </div>
                {apiKey.remaining !== null && apiKey.remaining !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Remaining:</span>
                    <span className="font-medium">{apiKey.remaining}</span>
                  </div>
                )}
              </div>
              <Separator />
            </div>
          )}

          {/* Expiration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Expiration</h3>
              {apiKey.expiresAt ? (
                <span className={isExpired ? "text-destructive font-medium" : ""}>
                  {new Date(apiKey.expiresAt).toLocaleDateString()}
                  {isExpired && " (Expired)"}
                </span>
              ) : (
                <span className="text-muted-foreground">Never</span>
              )}
            </div>
            <Separator />
          </div>

          {/* Metadata */}
          {apiKey.metadata?.notes && (
            <div className="space-y-2">
              <h3 className="font-medium">Notes</h3>
              <p className="text-sm text-muted-foreground">
                {apiKey.metadata.notes}
              </p>
              <Separator />
            </div>
          )}

          {/* Timestamps */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(apiKey.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last Updated</span>
              <span>{new Date(apiKey.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
