/**
 * Audit Log Table Columns
 *
 * Defines table columns for audit log data table with:
 * - Timestamp formatting
 * - Method badges
 * - Status code badges with color coding
 * - Duration display
 * - User/API key identification
 * - Action buttons
 */

import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Clock } from "lucide-react";
import type { AuditLogEntity } from "@/core/domain/audit-log/audit-log.entity";

interface AuditLogTableColumnsProps {
  onView: (log: AuditLogEntity) => void;
}

export function createAuditLogColumns({
  onView,
}: AuditLogTableColumnsProps): ColumnDef<AuditLogEntity>[] {
  return [
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
              <span className="font-mono text-sm truncate block max-w-[300px] cursor-help overflow-hidden whitespace-nowrap">
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
                  <span className="font-mono text-xs cursor-help truncate max-w-[150px] overflow-hidden whitespace-nowrap block">
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
        <Button variant="ghost" size="sm" onClick={() => onView(row.original)}>
          View
        </Button>
      ),
      size: 80,
      maxSize: 80,
    },
  ];
}
