"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Eye, Trash2, ExternalLink } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { MetadataViewModel } from "@/hooks/use-metadata";
import { formatDistanceToNow } from "date-fns";

export type Metadata = MetadataViewModel;

interface ActionsProps {
  onView: (metadata: Metadata) => void;
  onDelete: (metadata: Metadata) => void;
  onViewExternal?: (metadata: Metadata) => void;
}

export function createMetadataColumns({
  onView,
  onDelete,
  onViewExternal,
}: ActionsProps): ColumnDef<Metadata>[] {
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
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.image && (
            <img
              src={row.original.image}
              alt={row.original.name}
              className="h-10 w-10 rounded object-cover"
            />
          )}
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="max-w-md truncate text-sm text-muted-foreground">
          {row.original.description || "-"}
        </div>
      ),
    },
    {
      accessorKey: "attributes",
      header: "Attributes",
      cell: ({ row }) => {
        const count = row.original.attributes?.length || 0;
        return (
          <Badge variant="secondary">
            {count} {count === 1 ? "attribute" : "attributes"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "collection",
      header: "Collection",
      cell: ({ row }) => {
        const collection = row.original.collection;
        if (!collection?.name) {
          return <span className="text-sm text-muted-foreground">-</span>;
        }
        return (
          <div className="text-sm">
            <div className="font-medium">{collection.name}</div>
            {collection.family && (
              <div className="text-xs text-muted-foreground">{collection.family}</div>
            )}
          </div>
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
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(row.original.createdAt), {
            addSuffix: true,
          })}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const metadata = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onView(metadata)}
              title="View JSON"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {metadata.external_url && onViewExternal && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onViewExternal(metadata)}
                title="Open External URL"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(metadata)}
              title="Delete"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];
}
