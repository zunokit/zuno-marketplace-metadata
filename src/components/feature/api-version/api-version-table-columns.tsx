"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Star, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { ApiVersionViewModel } from "@/hooks/use-api-versions";

export const createApiVersionColumns = (options: {
  onSetCurrent: (version: ApiVersionViewModel) => void;
  onToggleDeprecated: (version: ApiVersionViewModel) => void;
  onDelete: (version: ApiVersionViewModel) => void;
}): ColumnDef<ApiVersionViewModel>[] => [
  {
    accessorKey: "id",
    header: "Version ID",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <code className="text-sm font-mono">{row.original.id}</code>
        {row.original.isCurrent && (
          <Badge variant="default" className="ml-2">
            <Star className="mr-1 h-3 w-3" />
            Current
          </Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: "label",
    header: "Label",
    cell: ({ row }) => <span className="font-medium">{row.original.label}</span>,
  },
  {
    accessorKey: "deprecated",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.deprecated ? "destructive" : "secondary"}>
        {row.original.deprecated ? "Deprecated" : "Active"}
      </Badge>
    ),
  },
  {
    accessorKey: "releasedAt",
    header: "Released",
    cell: ({ row }) => format(new Date(row.original.releasedAt), "MM/dd/yyyy"),
  },
  {
    accessorKey: "sunsetAt",
    header: "Sunset Date",
    cell: ({ row }) =>
      row.original.sunsetAt ? (
        <span className="text-orange-600">
          {format(new Date(row.original.sunsetAt), "MM/dd/yyyy")}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const version = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(version.id)}
            >
              Copy version ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {!version.isCurrent && (
              <DropdownMenuItem onClick={() => options.onSetCurrent(version)}>
                <Star className="mr-2 h-4 w-4" />
                Set as current
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => options.onToggleDeprecated(version)}>
              {version.deprecated ? "Mark as active" : "Mark as deprecated"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => options.onDelete(version)}
              className="text-destructive"
              disabled={version.isCurrent}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
