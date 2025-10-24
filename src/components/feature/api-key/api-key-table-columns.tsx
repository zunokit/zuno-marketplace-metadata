"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Eye, Trash2, Power, PowerOff } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { ApiKeyViewModel } from "@/hooks/use-api-keys";

export type ApiKey = ApiKeyViewModel;

interface ActionsProps {
  onView: (key: ApiKey) => void;
  onDelete: (key: ApiKey) => void;
  onToggleEnabled: (key: ApiKey) => void;
}

export function createApiKeyColumns({
  onView,
  onDelete,
  onToggleEnabled,
}: ActionsProps): ColumnDef<ApiKey>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "start",
      header: "Key Preview",
      cell: ({ row }) => (
        <code className="rounded bg-muted px-2 py-1 text-sm font-mono">
          {row.original.start ? `${row.original.start}...` : "***"}
        </code>
      ),
    },
    {
      accessorKey: "enabled",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.enabled ? "default" : "secondary"}>
          {row.original.enabled ? "Active" : "Disabled"}
        </Badge>
      ),
    },
    {
      accessorKey: "scopes",
      header: "Scopes",
      cell: ({ row }) => {
        const scopes = row.original.scopes;
        const scopeCount = scopes.length;

        if (scopeCount === 0) {
          return <span className="text-sm text-muted-foreground">No scopes</span>;
        }

        return (
          <div className="flex flex-wrap gap-1">
            {scopes.slice(0, 2).map((scope, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {scope}
              </Badge>
            ))}
            {scopeCount > 2 && (
              <Badge variant="outline" className="text-xs">
                +{scopeCount - 2} more
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "expiresAt",
      header: "Expires",
      cell: ({ row }) => {
        const expiresAt = row.original.expiresAt;
        if (!expiresAt) {
          return <span className="text-sm text-muted-foreground">Never</span>;
        }

        const isExpired = new Date(expiresAt) < new Date();
        return (
          <span className={isExpired ? "text-destructive" : ""}>
            {new Date(expiresAt).toLocaleDateString()}
          </span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onView(row.original)}
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleEnabled(row.original)}
            title={row.original.enabled ? "Disable" : "Enable"}
          >
            {row.original.enabled ? (
              <PowerOff className="h-4 w-4" />
            ) : (
              <Power className="h-4 w-4 text-green-600" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(row.original)}
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];
}
