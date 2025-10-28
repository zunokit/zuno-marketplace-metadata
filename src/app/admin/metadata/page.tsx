"use client";

import { useState } from "react";
import {
  useMetadata,
  useDeleteMetadata,
  type MetadataViewModel,
} from "@/hooks/use-metadata";
import { DataTable } from "@/components/data-table";
import { createMetadataColumns } from "@/components/feature/metadata/metadata-table-columns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

export default function MetadataPage() {
  const [selectedMetadata, setSelectedMetadata] =
    useState<MetadataViewModel | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const { data: metadata, isLoading, isFetching, error } = useMetadata();
  const deleteMutation = useDeleteMetadata();

  // Ensure metadata is always an array
  const metadataArray = Array.isArray(metadata) ? metadata : [];

  const handleView = (item: MetadataViewModel) => {
    setSelectedMetadata(item);
    setIsViewOpen(true);
  };

  const handleDelete = (item: MetadataViewModel) => {
    setSelectedMetadata(item);
    setIsDeleteOpen(true);
  };

  const handleViewExternal = (item: MetadataViewModel) => {
    if (item.external_url) {
      window.open(item.external_url, "_blank");
    }
  };

  const handleDeleteConfirm = () => {
    if (selectedMetadata) {
      deleteMutation.mutate(selectedMetadata.id, {
        onSuccess: () => {
          setIsDeleteOpen(false);
          setSelectedMetadata(null);
        },
      });
    }
  };

  const columns = createMetadataColumns({
    onView: handleView,
    onDelete: handleDelete,
    onViewExternal: handleViewExternal,
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading metadata...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">NFT Metadata</h1>
          <p className="text-muted-foreground">
            Manage NFT metadata for your marketplace
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Metadata Records</CardTitle>
          <CardDescription>
            View and manage all NFT metadata stored in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-8 text-center">
              <p className="text-lg font-medium text-destructive mb-2">
                Error loading metadata
              </p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "An error occurred"}
              </p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={metadataArray}
              isLoading={isFetching}
              searchKey="name"
              searchPlaceholder="Search by name..."
            />
          )}
        </CardContent>
      </Card>

      {/* View Detail Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedMetadata?.name}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(`/api/metadata/${selectedMetadata?.id}`, "_blank")
                }
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open JSON
              </Button>
            </DialogTitle>
            <DialogDescription>NFT Metadata Details</DialogDescription>
          </DialogHeader>
          {selectedMetadata && (
            <div className="space-y-6">
              {/* Preview Section */}
              {(selectedMetadata.image || selectedMetadata.animation_url) && (
                <div className="flex items-center justify-center bg-muted rounded-lg p-4">
                  {selectedMetadata.animation_url ? (
                    selectedMetadata.animation_url.endsWith(".mp4") ||
                    selectedMetadata.animation_url.endsWith(".webm") ? (
                      <video
                        src={selectedMetadata.animation_url}
                        className="max-h-[400px] rounded"
                        controls
                        poster={selectedMetadata.image}
                      />
                    ) : (
                      <iframe
                        src={selectedMetadata.animation_url}
                        className="w-full h-[400px] rounded"
                        title={selectedMetadata.name}
                      />
                    )
                  ) : selectedMetadata.image ? (
                    <Image
                      width={400}
                      height={400}
                      src={selectedMetadata.image}
                      alt={selectedMetadata.name}
                      className="max-h-[400px] rounded"
                    />
                  ) : null}
                </div>
              )}

              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Name
                  </label>
                  <p className="mt-1 text-sm">{selectedMetadata.name}</p>
                </div>
                {selectedMetadata.description && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Description
                    </label>
                    <p className="mt-1 text-sm">
                      {selectedMetadata.description}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    ID
                  </label>
                  <p className="mt-1 text-sm font-mono">
                    {selectedMetadata.id}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Created
                  </label>
                  <p className="mt-1 text-sm">
                    {formatDistanceToNow(new Date(selectedMetadata.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>

              {/* Collection Info */}
              {selectedMetadata.collection && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Collection
                  </label>
                  <div className="mt-1 space-y-1">
                    {selectedMetadata.collection.name && (
                      <p className="text-sm">
                        <span className="font-medium">Name:</span>{" "}
                        {selectedMetadata.collection.name}
                      </p>
                    )}
                    {selectedMetadata.collection.family && (
                      <p className="text-sm">
                        <span className="font-medium">Family:</span>{" "}
                        {selectedMetadata.collection.family}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Attributes */}
              {selectedMetadata.attributes &&
                selectedMetadata.attributes.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Attributes ({selectedMetadata.attributes.length})
                    </label>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                      {selectedMetadata.attributes.map((attr, index) => (
                        <div key={index} className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">
                            {attr.trait_type}
                          </p>
                          <p className="text-sm font-medium">{attr.value}</p>
                          {attr.display_type && (
                            <p className="text-xs text-muted-foreground capitalize">
                              {attr.display_type.replace("_", " ")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* URLs */}
              <div className="space-y-3">
                {selectedMetadata.image && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Image URL
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={selectedMetadata.image}
                        readOnly
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-xs font-mono"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigator.clipboard.writeText(selectedMetadata.image!)
                        }
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                )}
                {selectedMetadata.animation_url && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Animation URL
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={selectedMetadata.animation_url}
                        readOnly
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-xs font-mono"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigator.clipboard.writeText(
                            selectedMetadata.animation_url!
                          )
                        }
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                )}
                {selectedMetadata.external_url && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      External URL
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={selectedMetadata.external_url}
                        readOnly
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-xs font-mono"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(selectedMetadata.external_url, "_blank")
                        }
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Raw JSON (Collapsible) */}
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                  View Raw JSON
                </summary>
                <div className="mt-2 rounded-lg bg-muted p-4">
                  <pre className="text-xs whitespace-pre-wrap wrap-break-word">
                    {JSON.stringify(selectedMetadata, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Metadata?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedMetadata?.name}? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
