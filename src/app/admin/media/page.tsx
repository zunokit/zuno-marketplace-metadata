"use client";

import { useState } from "react";
import { useMedia, useDeleteMedia, type MediaViewModel } from "@/hooks/use-media";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Search, Trash2, ExternalLink, Download, Image as ImageIcon, Video, Box } from "lucide-react";
import { formatBytes } from "@/shared/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

export default function MediaPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedMedia, setSelectedMedia] = useState<MediaViewModel | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data: media, isLoading, error } = useMedia(page, 20);
  const deleteMutation = useDeleteMedia();

  // Ensure media is always an array
  const mediaArray = Array.isArray(media) ? media : [];

  const filteredMedia = mediaArray.filter((item: MediaViewModel) =>
    item.fileName?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (item: MediaViewModel) => {
    setSelectedMedia(item);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedMedia) {
      deleteMutation.mutate(selectedMedia.id, {
        onSuccess: () => {
          setIsDeleteOpen(false);
          setSelectedMedia(null);
        },
      });
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Media Assets</h1>
          <p className="text-muted-foreground">
            Manage images, videos, and 3D models for NFTs
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Media Library</CardTitle>
              <CardDescription>
                View and manage all media assets stored in the system
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search media..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-8 text-center">
              <p className="text-lg font-medium text-destructive mb-2">Error loading media</p>
              <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "An error occurred"}</p>
            </div>
          ) : isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
                <p className="mt-4 text-sm text-muted-foreground">Loading media...</p>
              </div>
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="rounded-md border">
              <div className="p-8 text-center text-muted-foreground">
                <p className="text-lg font-medium mb-2">No media found</p>
                <p className="text-sm">
                  {search
                    ? "Try adjusting your search"
                    : "Media assets will appear here once uploaded through the API"}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredMedia.map((item: MediaViewModel) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="aspect-square relative bg-muted">
                    {item.mediaType === "image" && (
                      <Image
                        src={item.thumbnailUrl || item.url}
                        alt={item.fileName}
                        width={100}
                        height={100}
                        loading="lazy"
                        unoptimized={true}
                      />
                    )}
                    {item.mediaType === "video" && (
                      <video
                        src={item.url}
                        className="w-full h-full object-cover"
                        controls={false}
                      />
                    )}
                    {item.mediaType === "3d_model" && (
                      <div className="flex h-full items-center justify-center">
                        <Box className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => window.open(item.url, "_blank")}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              const link = document.createElement("a");
                              link.href = item.url;
                              link.download = item.fileName;
                              link.click();
                            }}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(item)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium" title={item.fileName}>
                          {item.fileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(item.fileSize)}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        <span className="mr-1">{getMediaIcon(item.mediaType)}</span>
                        {item.mediaType}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedMedia?.fileName}&quot;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
