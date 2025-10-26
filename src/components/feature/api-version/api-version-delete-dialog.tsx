"use client";

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
import { useDeleteApiVersion, type ApiVersionViewModel } from "@/hooks/use-api-versions";

interface ApiVersionDeleteDialogProps {
  version: ApiVersionViewModel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiVersionDeleteDialog({
  version,
  open,
  onOpenChange,
}: ApiVersionDeleteDialogProps) {
  const deleteMutation = useDeleteApiVersion();

  const handleDelete = async () => {
    if (!version) return;
    await deleteMutation.mutateAsync(version.id);
    onOpenChange(false);
  };

  if (!version) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete API Version</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete version <strong>{version.id}</strong> ({version.label})?
            {version.isCurrent && (
              <span className="block mt-2 text-destructive font-semibold">
                You cannot delete the current API version.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={version.isCurrent || deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
