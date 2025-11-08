"use client";

import { useState } from "react";
import { DataTable } from "@/components/data-table";
import {
  useApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
  useUpdateApiKey,
  type ApiKeyViewModel,
} from "@/hooks/use-api-keys";
import { createApiKeyColumns } from "@/components/feature/api-key/api-key-table-columns";
import { ApiKeyFormDialog } from "@/components/feature/api-key/api-key-form-dialog";
import { ApiKeyViewDialog } from "@/components/feature/api-key/api-key-view-dialog";
import { ApiKeyDeleteDialog } from "@/components/feature/api-key/api-key-delete-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { toast } from "sonner";

export default function ApiKeysPage() {
  const [selectedKey, setSelectedKey] = useState<ApiKeyViewModel | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  // Queries
  const { data: apiKeys = [], isLoading, isFetching } = useApiKeys();

  // Mutations
  const createMutation = useCreateApiKey();
  const deleteMutation = useDeleteApiKey();
  const updateMutation = useUpdateApiKey();

  // Handlers
  const handleView = (key: ApiKeyViewModel) => {
    setSelectedKey(key);
    setIsViewOpen(true);
  };

  const handleDelete = (key: ApiKeyViewModel) => {
    setSelectedKey(key);
    setIsDeleteOpen(true);
  };

  const handleToggleEnabled = (key: ApiKeyViewModel) => {
    updateMutation.mutate({
      id: key.id,
      enabled: !key.enabled,
    });
  };

  const handleCreate = (data: {
    name: string;
    permissions: Record<string, string[]>;
    metadata?: {
      scopes?: string[];
      notes?: string;
    };
    expiresIn?: number;
    rateLimitEnabled?: boolean;
    rateLimitMax?: number;
    rateLimitTimeWindow?: number;
  }) => {
    createMutation.mutate(data, {
      onSuccess: (result: { id?: string; key?: string }) => {
        if (result.key) {
          setNewKey(result.key);
        }
      },
    });
  };

  const handleDeleteConfirm = () => {
    if (selectedKey) {
      deleteMutation.mutate(selectedKey.id, {
        onSuccess: () => {
          setIsDeleteOpen(false);
          setSelectedKey(null);
        },
      });
    }
  };

  const handleFormClose = () => {
    setNewKey(null);
  };

  const handleEdit = () => {
    // For now, we can only toggle enabled/disabled via the table
    // Editing permissions requires Better Auth update support
    toast.info("To modify this API key, use the toggle switch in the table to enable/disable it, or delete and recreate with new permissions.");
  };

  // Columns
  const columns = createApiKeyColumns({
    onView: handleView,
    onDelete: handleDelete,
    onToggleEnabled: handleToggleEnabled,
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading API keys...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">API Keys Management</h1>
        <p className="text-muted-foreground">
          Create and manage API keys for programmatic access
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          API keys provide programmatic access to the metadata API. Keep them
          secure and never share them publicly. You can create keys with
          different permission levels and revoke them at any time.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active API Keys</CardTitle>
              <CardDescription>
                {apiKeys.length} {apiKeys.length === 1 ? "key" : "keys"} total
              </CardDescription>
            </div>
            <ApiKeyFormDialog
              onCreate={handleCreate}
              isCreating={createMutation.isPending}
              newKey={newKey}
              onClose={handleFormClose}
            />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={apiKeys}
            searchKey="name"
            searchPlaceholder="Search API keys..."
            isLoading={isFetching}
          />
        </CardContent>
      </Card>

      <ApiKeyViewDialog
        apiKey={selectedKey}
        isOpen={isViewOpen}
        onClose={() => {
          setIsViewOpen(false);
          setSelectedKey(null);
        }}
        onEdit={handleEdit}
      />

      <ApiKeyDeleteDialog
        apiKey={selectedKey}
        isOpen={isDeleteOpen}
        isDeleting={deleteMutation.isPending}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedKey(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
