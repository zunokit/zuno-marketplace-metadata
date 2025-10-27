"use client";

import { useState } from "react";
import {
  useMedia,
  useDeleteMedia,
  type MediaViewModel,
} from "@/hooks/use-media";
import { DataTable } from "@/components/data-table";
import { createMediaColumns } from "@/components/feature/media/media-table-columns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, Video, Box } from "lucide-react";
import { formatBytes } from "@/shared/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

export default function MediaPage() {
  const [selectedMedia, setSelectedMedia] = useState<MediaViewModel | null>(
    null
  );
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: media, isLoading, error } = useMedia(1, 20);
  const deleteMutation = useDeleteMedia();

  // Ensure media is always an array
  const mediaArray = Array.isArray(media) ? media : [];

  const handleViewDetail = (item: MediaViewModel) => {
    setSelectedMedia(item);
    setIsDetailOpen(true);
  };

  const handleDelete = (item: MediaViewModel) => {
    setSelectedMedia(item);
    setIsDeleteOpen(true);
  };

  const handleOpen = (item: MediaViewModel) => {
    window.open(item.url, "_blank");
  };

  const handleDownload = (item: MediaViewModel) => {
    const link = document.createElement("a");
    link.href = item.url;
    link.download = item.fileName;
    link.click();
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

  const columns = createMediaColumns({
    onView: handleViewDetail,
    onDelete: handleDelete,
    onOpen: handleOpen,
    onDownload: handleDownload,
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading media...</p>
        </div>
      </div>
    );
  }

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
          <CardTitle>Media Library</CardTitle>
          <CardDescription>
            View and manage all media assets stored in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-8 text-center">
              <p className="text-lg font-medium text-destructive mb-2">
                Error loading media
              </p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "An error occurred"}
              </p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={mediaArray}
              searchKey="fileName"
              searchPlaceholder="Search media..."
              isLoading={false}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Media Details</DialogTitle>
            <DialogDescription>
              View detailed information about this media asset
            </DialogDescription>
          </DialogHeader>
          {selectedMedia && (
            <div className="space-y-6">
              <div className="flex items-center justify-center bg-muted rounded-lg p-4">
                {selectedMedia.mediaType === "image" && (
                  <Image
                    src={selectedMedia.url}
                    alt={selectedMedia.fileName}
                    width={400}
                    height={400}
                    className="max-h-[400px] object-contain"
                    unoptimized={true}
                  />
                )}
                {selectedMedia.mediaType === "video" && (
                  <video
                    src={selectedMedia.url}
                    className="max-h-[400px] rounded"
                    controls
                  />
                )}
                {selectedMedia.mediaType === "3d_model" && (
                  <div className="flex h-[400px] items-center justify-center">
                    <Box className="h-32 w-32 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    File Name
                  </label>
                  <p className="mt-1 text-sm">{selectedMedia.fileName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    File Size
                  </label>
                  <p className="mt-1 text-sm">
                    {formatBytes(selectedMedia.fileSize)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    MIME Type
                  </label>
                  <p className="mt-1 text-sm">{selectedMedia.mimeType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Media Type
                  </label>
                  <p className="mt-1">
                    <Badge variant="secondary" className="capitalize">
                      <span className="mr-1">
                        {getMediaIcon(selectedMedia.mediaType)}
                      </span>
                      {selectedMedia.mediaType}
                    </Badge>
                  </p>
                </div>
                {selectedMedia.width && selectedMedia.height && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Dimensions
                    </label>
                    <p className="mt-1 text-sm">
                      {selectedMedia.width} × {selectedMedia.height}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    IPFS Status
                  </label>
                  <p className="mt-1">
                    {selectedMedia.isPinned ? (
                      <Badge variant="default" className="bg-green-600">
                        Pinned
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not Pinned</Badge>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Created
                  </label>
                  <p className="mt-1 text-sm">
                    {formatDistanceToNow(new Date(selectedMedia.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    ID
                  </label>
                  <p className="mt-1 text-xs font-mono">{selectedMedia.id}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  URL
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    value={selectedMedia.url}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedMedia.url);
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              {selectedMedia.thumbnailUrl && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Thumbnail URL
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <Input
                      value={selectedMedia.thumbnailUrl}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          selectedMedia.thumbnailUrl || ""
                        );
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedMedia?.fileName}
              &quot;? This action cannot be undone.
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
