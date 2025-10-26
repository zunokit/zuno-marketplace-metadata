/**
 * Audit Logs Admin Page
 *
 * Comprehensive audit trail viewer with:
 * - Server-side pagination
 * - Advanced filtering (date range, method, action, status, user)
 * - Real-time statistics
 * - Detailed view with metadata
 */

"use client";

import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  RefreshCw,
  X,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import {
  useAuditLogs,
  useAuditLogStats,
  useInvalidateAuditLogs,
} from "@/hooks/use-audit-logs";
import type { AuditLogEntity } from "@/core/domain/audit-log/audit-log.entity";

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Filters
  const [method, setMethod] = useState<string>("all");
  const [statusCode, setStatusCode] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // View dialog
  const [selectedLog, setSelectedLog] = useState<AuditLogEntity | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  // Build filters object
  const filters = {
    ...(method && method !== "all" && { method }),
    ...(statusCode &&
      statusCode !== "all" && { statusCode: parseInt(statusCode) }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  };

  // Fetch audit logs
  const {
    data: logsData,
    isLoading,
    isFetching,
  } = useAuditLogs(page, limit, filters, {
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  // Fetch statistics
  const { data: stats } = useAuditLogStats(filters);

  // Cache invalidation
  const { invalidateAll } = useInvalidateAuditLogs();

  const logs = logsData?.data || [];

  const handleView = (log: AuditLogEntity) => {
    setSelectedLog(log);
    setIsViewOpen(true);
  };

  const handleClearFilters = () => {
    setMethod("all");
    setStatusCode("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const handleRefresh = () => {
    invalidateAll();
  };

  const columns: ColumnDef<AuditLogEntity>[] = [
    {
      accessorKey: "createdAt",
      header: "Timestamp",
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{new Date(row.original.createdAt).toLocaleDateString()}</div>
          <div className="text-muted-foreground text-xs">
            {new Date(row.original.createdAt).toLocaleTimeString()}
          </div>
        </div>
      ),
      size: 120,
      maxSize: 120,
    },
    {
      accessorKey: "method",
      header: "Method",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          {row.original.method}
        </Badge>
      ),
      size: 80,
      maxSize: 80,
    },
    {
      accessorKey: "path",
      header: "Path",
      cell: ({ row }) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="font-mono text-sm truncate block max-w-[300px] cursor-help overflow-hidden whitespace-nowrap"
              >
                {row.original.path}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-md">
              <p className="font-mono text-xs break-all">{row.original.path}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
      size: 300,
      maxSize: 300,
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.action}</Badge>
      ),
      size: 100,
      maxSize: 100,
    },
    {
      accessorKey: "statusCode",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.statusCode;
        const variant =
          status >= 500
            ? "destructive"
            : status >= 400
            ? "default"
            : "secondary";

        return (
          <Badge variant={variant} className="font-mono">
            {status}
          </Badge>
        );
      },
      size: 80,
      maxSize: 80,
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm">
          <Clock className="h-3 w-3" />
          {row.original.duration ? `${row.original.duration}ms` : "-"}
        </div>
      ),
      size: 100,
      maxSize: 100,
    },
    {
      accessorKey: "userId",
      header: "User",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.userId ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="font-mono text-xs cursor-help truncate max-w-[150px] overflow-hidden whitespace-nowrap block"
                  >
                    {row.original.userId.slice(0, 8)}...
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="font-mono text-xs">{row.original.userId}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : row.original.apiKeyId ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs cursor-help">
                    API Key
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="font-mono text-xs">{row.original.apiKeyId}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </span>
      ),
      size: 150,
      maxSize: 150,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleView(row.original)}
        >
          View
        </Button>
      ),
      size: 80,
      maxSize: 80,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading audit logs...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">
            Complete audit trail of all API requests
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Requests</CardDescription>
              <CardTitle className="text-2xl">
                {stats.totalRequests.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Success Rate</CardDescription>
              <CardTitle className="text-2xl">
                {stats.totalRequests > 0
                  ? Math.round(
                      ((stats.totalRequests - stats.totalErrors) /
                        stats.totalRequests) *
                        100
                    )
                  : 0}
                %
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Errors</CardDescription>
              <CardTitle className="text-2xl text-destructive">
                {stats.totalErrors.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg Duration</CardDescription>
              <CardTitle className="text-2xl">
                {Math.round(stats.avgDuration)}ms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="method">Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="All methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All methods</SelectItem>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="statusCode">Status Code</Label>
                <Select value={statusCode} onValueChange={setStatusCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="200">200 (OK)</SelectItem>
                    <SelectItem value="201">201 (Created)</SelectItem>
                    <SelectItem value="400">400 (Bad Request)</SelectItem>
                    <SelectItem value="401">401 (Unauthorized)</SelectItem>
                    <SelectItem value="403">403 (Forbidden)</SelectItem>
                    <SelectItem value="404">404 (Not Found)</SelectItem>
                    <SelectItem value="429">429 (Rate Limited)</SelectItem>
                    <SelectItem value="500">500 (Server Error)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={logs} />
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              {selectedLog && new Date(selectedLog.createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Method</Label>
                  <p className="font-mono">{selectedLog.method}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status Code</Label>
                  <p className="font-mono">{selectedLog.statusCode}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Path</Label>
                <p className="font-mono text-sm">{selectedLog.path}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Action</Label>
                <p>{selectedLog.action}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Duration</Label>
                  <p>
                    {selectedLog.duration ? `${selectedLog.duration}ms` : "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">IP Address</Label>
                  <p className="font-mono">{selectedLog.ipAddress || "-"}</p>
                </div>
              </div>

              {selectedLog.userId && (
                <div>
                  <Label className="text-muted-foreground">User ID</Label>
                  <p className="font-mono text-sm">{selectedLog.userId}</p>
                </div>
              )}

              {selectedLog.apiKeyId && (
                <div>
                  <Label className="text-muted-foreground">API Key ID</Label>
                  <p className="font-mono text-sm">{selectedLog.apiKeyId}</p>
                </div>
              )}

              {selectedLog.userAgent && (
                <div>
                  <Label className="text-muted-foreground">User Agent</Label>
                  <p className="text-sm break-all">{selectedLog.userAgent}</p>
                </div>
              )}

              {selectedLog.metadata && (
                <div>
                  <Label className="text-muted-foreground">Metadata</Label>
                  <pre className="mt-2 p-4 bg-muted rounded-md text-xs overflow-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
