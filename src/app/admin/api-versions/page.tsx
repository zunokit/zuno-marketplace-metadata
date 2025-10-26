"use client";

import { useState } from "react";
import { DataTable } from "@/components/data-table";
import {
  useApiVersions,
  useUpdateApiVersion,
  type ApiVersionViewModel,
} from "@/hooks/use-api-versions";
import { createApiVersionColumns } from "@/components/feature/api-version/api-version-table-columns";
import { ApiVersionFormDialog } from "@/components/feature/api-version/api-version-form-dialog";
import { ApiVersionDeleteDialog } from "@/components/feature/api-version/api-version-delete-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function ApiVersionsPage() {
  const [selectedVersion, setSelectedVersion] = useState<ApiVersionViewModel | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Queries
  const { data: versions = [], isLoading } = useApiVersions();

  // Mutations
  const updateMutation = useUpdateApiVersion();

  // Handlers
  const handleSetCurrent = (version: ApiVersionViewModel) => {
    updateMutation.mutate({
      id: version.id,
      isCurrent: true,
    });
  };

  const handleToggleDeprecated = (version: ApiVersionViewModel) => {
    updateMutation.mutate({
      id: version.id,
      deprecated: !version.deprecated,
    });
  };

  const handleDelete = (version: ApiVersionViewModel) => {
    setSelectedVersion(version);
    setIsDeleteOpen(true);
  };

  const columns = createApiVersionColumns({
    onSetCurrent: handleSetCurrent,
    onToggleDeprecated: handleToggleDeprecated,
    onDelete: handleDelete,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Versions</h1>
          <p className="text-muted-foreground">
            Manage API versions for IPFS filename generation
          </p>
        </div>
        <ApiVersionFormDialog />
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          API versions are used to generate unique filenames when uploading to IPFS.
          The current version is automatically used for all new uploads.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Versions</CardTitle>
          <CardDescription>
            {versions.length} version{versions.length !== 1 ? "s" : ""} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={versions}
            isLoading={isLoading}
            searchKey="label"
            searchPlaceholder="Search versions..."
          />
        </CardContent>
      </Card>

      <ApiVersionDeleteDialog
        version={selectedVersion}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
      />
    </div>
  );
}
