"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpDown,
  Eye,
  Trash2,
  ExternalLink,
  Download,
  Image as ImageIcon,
  Video,
  Box,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { MediaViewModel } from "@/hooks/use-media";
import { formatDistanceToNow } from "date-fns";
import { formatBytes } from "@/shared/lib/utils";
import Image from "next/image";

export type Media = MediaViewModel;

interface ActionsProps {
  onView: (media: Media) => void;
  onDelete: (media: Media) => void;
  onOpen?: (media: Media) => void;
  onDownload?: (media: Media) => void;
}

const getMediaIcon = (type: string) => {
  switch (type) {
    case "image":
      return <ImageIcon className="h-4 w-4" />;
    case "video":
      return <Video className="h-4 w-4" />;
    case "3d_model":
      return <Box className="h-4 w-4" />;
    default:
      return <ImageIcon className="h-4 w-4" />;
  }
};

export function createMediaColumns({
  onView,
  onDelete,
  onOpen,
  onDownload,
}: ActionsProps): ColumnDef<Media>[] {
  return [
    {
      accessorKey: "preview",
      header: "Preview",
      cell: ({ row }) => (
        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden">
          {row.original.mediaType === "image" && row.original.thumbnailUrl ? (
            <Image
              src={row.original.thumbnailUrl}
              alt={row.original.fileName}
              width={48}
              height={48}
              className="object-cover w-full h-full"
              unoptimized={true}
            />
          ) : (
            getMediaIcon(row.original.mediaType)
          )}
        </div>
      ),
      size: 60,
      maxSize: 60,
    },
    {
      accessorKey: "fileName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          File Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="max-w-[300px]">
          <div className="font-medium truncate" title={row.original.fileName}>
            {row.original.fileName}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.original.mimeType}
          </div>
        </div>
      ),
      size: 300,
      maxSize: 300,
    },
    {
      accessorKey: "mediaType",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="secondary" className="capitalize">
          <span className="mr-1">{getMediaIcon(row.original.mediaType)}</span>
          {row.original.mediaType}
        </Badge>
      ),
    },
    {
      accessorKey: "fileSize",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Size
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm">{formatBytes(row.original.fileSize)}</span>
      ),
    },
    {
      accessorKey: "dimensions",
      header: "Dimensions",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.width && row.original.height
            ? `${row.original.width} × ${row.original.height}`
            : "-"}
        </span>
      ),
    },
    {
      accessorKey: "isPinned",
      header: "IPFS",
      cell: ({ row }) =>
        row.original.isPinned ? (
          <Badge variant="default" className="bg-green-600">
            Pinned
          </Badge>
        ) : (
          <Badge variant="outline">Not Pinned</Badge>
        ),
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
        const media = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onView(media)}
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {onOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpen(media)}
                title="Open File"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
            {onDownload && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDownload(media)}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(media)}
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
