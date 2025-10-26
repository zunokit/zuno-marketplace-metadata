"use client";

import { useState } from "react";
import { useMedia, useDeleteMedia, type MediaViewModel } from "@/hooks/use-media";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Search, Trash2, ExternalLink, Download, Image as ImageIcon, Video, Box, Eye } from "lucide-react";
import { formatBytes } from "@/shared/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

export default function MediaPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedMedia, setSelectedMedia] = useState<MediaViewModel | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: media, isLoading, error } = useMedia(page, 20);
  const deleteMutation = useDeleteMedia();

  // Ensure media is always an array
  const mediaArray = Array.isArray(media) ? media : [];

  const filteredMedia = mediaArray.filter((item: MediaViewModel) =>
    item.fileName?.toLowerCase().includes(search.toLowerCase())
  );

  const handleViewDetail = (item: MediaViewModel) => {
    setSelectedMedia(item);
    setIsDetailOpen(true);
  };

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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Preview</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Dimensions</TableHead>
                    <TableHead>IPFS</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMedia.map((item: MediaViewModel) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden">
                          {item.mediaType === "image" && item.thumbnailUrl ? (
                            <Image
                              src={item.thumbnailUrl}
                              alt={item.fileName}
                              width={48}
                              height={48}
                              className="object-cover w-full h-full"
                              unoptimized={true}
                            />
                          ) : (
                            getMediaIcon(item.mediaType)
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="max-w-[300px] truncate" title={item.fileName}>
                          {item.fileName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.mimeType}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          <span className="mr-1">{getMediaIcon(item.mediaType)}</span>
                          {item.mediaType}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatBytes(item.fileSize)}</TableCell>
                      <TableCell>
                        {item.width && item.height ? (
                          <span className="text-sm">
                            {item.width} × {item.height}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.isPinned ? (
                          <Badge variant="default" className="bg-green-600">
                            Pinned
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not Pinned</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetail(item)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Details
                            </DropdownMenuItem>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
                  <label className="text-sm font-medium text-muted-foreground">File Name</label>
                  <p className="mt-1 text-sm">{selectedMedia.fileName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">File Size</label>
                  <p className="mt-1 text-sm">{formatBytes(selectedMedia.fileSize)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">MIME Type</label>
                  <p className="mt-1 text-sm">{selectedMedia.mimeType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Media Type</label>
                  <p className="mt-1">
                    <Badge variant="secondary" className="capitalize">
                      <span className="mr-1">{getMediaIcon(selectedMedia.mediaType)}</span>
                      {selectedMedia.mediaType}
                    </Badge>
                  </p>
                </div>
                {selectedMedia.width && selectedMedia.height && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Dimensions</label>
                    <p className="mt-1 text-sm">
                      {selectedMedia.width} × {selectedMedia.height}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">IPFS Status</label>
                  <p className="mt-1">
                    {selectedMedia.isPinned ? (
                      <Badge variant="default" className="bg-green-600">Pinned</Badge>
                    ) : (
                      <Badge variant="outline">Not Pinned</Badge>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="mt-1 text-sm">
                    {formatDistanceToNow(new Date(selectedMedia.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ID</label>
                  <p className="mt-1 text-sm font-mono text-xs">{selectedMedia.id}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">URL</label>
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
                  <label className="text-sm font-medium text-muted-foreground">Thumbnail URL</label>
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
                        navigator.clipboard.writeText(selectedMedia.thumbnailUrl || "");
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
