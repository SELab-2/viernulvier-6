"use client";

import {
    ColumnDef,
    ExpandedState,
    Row,
    flexRender,
    getCoreRowModel,
    getExpandedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, ReactNode, useState } from "react";

// Generic memoized subtable that only rerenders when its own row items change.
// TanStack Query structural sharing ensures unchanged items keep their reference,
// so the element-level comparator correctly skips rerenders for unaffected rows.
function MemoSubTableInner<T>({ items, columns }: { items: T[]; columns: ColumnDef<T>[] }) {
    return (
        <div className="bg-muted/30 py-1 pr-6 pl-12">
            <DataTable columns={columns} data={items} compact />
        </div>
    );
}
MemoSubTableInner.displayName = "MemoSubTable";
export const MemoSubTable = memo(
    MemoSubTableInner,
    <T,>(
        prev: { items: T[]; columns: ColumnDef<T>[] },
        next: { items: T[]; columns: ColumnDef<T>[] }
    ) =>
        prev.columns === next.columns &&
        prev.items.length === next.items.length &&
        prev.items.every((item, i) => item === next.items[i])
) as <T>(props: { items: T[]; columns: ColumnDef<T>[] }) => ReactNode;

import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface ExpanderLabels {
    show: string;
    hide: string;
}

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    renderSubComponent?: (row: Row<TData>) => ReactNode;
    getRowCanExpand?: (row: Row<TData>) => boolean;
    expanderLabels?: ExpanderLabels;
    compact?: boolean;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    renderSubComponent,
    getRowCanExpand,
    expanderLabels,
    compact = false,
}: DataTableProps<TData, TValue>) {
    const [expanded, setExpanded] = useState<ExpandedState>({});

    const expanderColumn: ColumnDef<TData> = {
        id: "expander",
        header: () => null,
        cell: ({ row }) =>
            row.getCanExpand() ? (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={row.getToggleExpandedHandler()}
                            className="h-6 w-6 p-0"
                        >
                            {row.getIsExpanded() ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                        </Button>
                    </TooltipTrigger>
                    {expanderLabels && (
                        <TooltipContent>
                            {row.getIsExpanded() ? expanderLabels.hide : expanderLabels.show}
                        </TooltipContent>
                    )}
                </Tooltip>
            ) : null,
    };

    const allColumns: ColumnDef<TData, TValue>[] = renderSubComponent
        ? [expanderColumn as ColumnDef<TData, TValue>, ...columns]
        : columns;

    const spacerColumn: ColumnDef<TData, TValue> = {
        id: "spacer",
        header: () => null,
        cell: () => null,
    };

    const finalColumns: ColumnDef<TData, TValue>[] = (() => {
        const actionsIdx = allColumns.findIndex((c) => c.id === "actions");
        const cols = [...allColumns];
        if (actionsIdx !== -1) {
            cols.splice(actionsIdx, 0, spacerColumn);
        } else {
            cols.push(spacerColumn);
        }
        return cols;
    })();

    // @tanstack/react-table peer dep mismatch triggers this rule
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns: finalColumns,
        getCoreRowModel: getCoreRowModel(),
        ...(renderSubComponent && {
            getExpandedRowModel: getExpandedRowModel(),
            getRowCanExpand,
            state: { expanded },
            onExpandedChange: setExpanded,
        }),
    });

    return (
        <TooltipProvider>
            <div className={compact ? undefined : "overflow-hidden rounded-md border"}>
                <Table
                    className={
                        compact
                            ? "text-xs [&_tbody_tr]:border-0 [&_td]:py-1.5 [&_thead]:border-b"
                            : "text-sm"
                    }
                >
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className={
                                            header.column.id === "spacer"
                                                ? "w-full"
                                                : "w-px whitespace-nowrap"
                                        }
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef.header,
                                                  header.getContext()
                                              )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <Fragment key={row.id}>
                                    <TableRow
                                        data-state={row.getIsSelected() ? "selected" : undefined}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell
                                                key={cell.id}
                                                className={
                                                    cell.column.id === "spacer"
                                                        ? "w-full p-0"
                                                        : "whitespace-nowrap"
                                                }
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                    {renderSubComponent && row.getIsExpanded() && (
                                        <TableRow key={`${row.id}-expanded`}>
                                            <TableCell
                                                colSpan={finalColumns.length}
                                                className="p-0"
                                            >
                                                {renderSubComponent(row)}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </Fragment>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={finalColumns.length}
                                    className="h-24 text-center"
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </TooltipProvider>
    );
}
