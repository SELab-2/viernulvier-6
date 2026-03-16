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
                <TooltipProvider>
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
                </TooltipProvider>
            ) : null,
    };

    const allColumns: ColumnDef<TData, TValue>[] = renderSubComponent
        ? [expanderColumn as ColumnDef<TData, TValue>, ...columns]
        : columns;

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns: allColumns,
        getCoreRowModel: getCoreRowModel(),
        ...(renderSubComponent && {
            getExpandedRowModel: getExpandedRowModel(),
            getRowCanExpand,
            state: { expanded },
            onExpandedChange: setExpanded,
        }),
    });

    return (
        <div className={compact ? undefined : "overflow-hidden rounded-md border"}>
            <Table
                className={
                    compact ? "[&_tbody_tr]:border-0 [&_td]:py-1.5 [&_thead]:border-b" : undefined
                }
            >
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <TableHead key={header.id}>
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
                                <TableRow data-state={row.getIsSelected() && "selected"}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                                {renderSubComponent && row.getIsExpanded() && (
                                    <TableRow>
                                        <TableCell colSpan={allColumns.length} className="p-0">
                                            {renderSubComponent(row)}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </Fragment>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={allColumns.length} className="h-24 text-center">
                                No results.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
