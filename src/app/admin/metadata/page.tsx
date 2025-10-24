"use client";

import { useState } from "react";
import { useMetadata, useDeleteMetadata, type MetadataViewModel } from "@/hooks/use-metadata";
import { DataTable } from "@/components/data-table";
import { createMetadataColumns } from "@/components/feature/metadata/metadata-table-columns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function MetadataPage() {
  const [selectedMetadata, setSelectedMetadata] = useState<MetadataViewModel | null>(null);
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
          <p className="mt-4 text-sm text-muted-foreground">Loading metadata...</p>
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
              <p className="text-lg font-medium text-destructive mb-2">Error loading metadata</p>
              <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "An error occurred"}</p>
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

      {/* View JSON Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {selectedMetadata?.name}
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/api/metadata/${selectedMetadata?.id}`, "_blank")}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open JSON
              </Button>
            </DialogTitle>
            <DialogDescription>
              Full metadata JSON structure
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted p-4">
            <pre className="text-sm overflow-x-auto">
              {JSON.stringify(selectedMetadata, null, 2)}
            </pre>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Metadata?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedMetadata?.name}? This action cannot be
              undone.
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
