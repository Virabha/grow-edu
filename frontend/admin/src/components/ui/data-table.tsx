"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { LucideIcon } from "lucide-react";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
export interface Column<T> {
    key: keyof T | string;
    header: string;
    cell?: (row: T) => React.ReactNode;
    className?: string;
    headerClassName?: string;
    hideOnMobile?: boolean;
}
interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    isLoading?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
    emptyIcon?: LucideIcon;
    onRowClick?: (row: T) => void;
    className?: string;
    keyExtractor?: (row: T, index: number) => string | number;
}
export function DataTable<T extends Record<string, any>>({ data, columns, isLoading = false, emptyTitle = "No data", emptyDescription = "There is no data to display.", emptyIcon, onRowClick, className, keyExtractor, }: DataTableProps<T>) {
    if (isLoading) {
        return <DataTableSkeleton columnCount={columns.length}/>;
    }
    if (data.length === 0) {
        const IconComponent = emptyIcon;
        return (<EmptyState title={emptyTitle} description={emptyDescription} icon={IconComponent ? <IconComponent className="h-12 w-12"/> : undefined}/>);
    }
    return (<div className={cn("rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (<TableHead key={String(column.key)} className={cn(column.headerClassName, column.hideOnMobile && "hidden md:table-cell")}>
                {column.header}
              </TableHead>))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (<TableRow key={keyExtractor ? keyExtractor(row, index) : index} onClick={() => onRowClick?.(row)} className={onRowClick ? "cursor-pointer" : ""}>
              {columns.map((column) => (<TableCell key={String(column.key)} className={cn(column.className, column.hideOnMobile && "hidden md:table-cell")}>
                  {column.cell
                    ? column.cell(row)
                    : (row[column.key] as React.ReactNode)}
                </TableCell>))}
            </TableRow>))}
        </TableBody>
      </Table>
    </div>);
}
