"use client";

import {
    ColumnDef,
    ExpandedState,
    OnChangeFn,
    Row,
    RowSelectionState,
    flexRender,
    getCoreRowModel,
    getExpandedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, ReactNode, memo, useMemo, useState } from "react";

// Generic memoized subtable that only rerenders when its own row items or selection changes.
// TanStack Query structural sharing ensures unchanged items keep their reference,
// so the element-level comparator correctly skips rerenders for unaffected rows.
function MemoSubTableInner<T>({
    items,
    columns,
    rowSelection,
    onRowSelectionChange,
    getRowId,
}: {
    items: T[];
    columns: ColumnDef<T>[];
    rowSelection?: RowSelectionState;
    onRowSelectionChange?: OnChangeFn<RowSelectionState>;
    getRowId?: (row: T) => string;
}) {
    return (
        <div className="border-foreground/10 bg-foreground/[0.02] py-1 pr-6 pl-14">
            <DataTable
                columns={columns}
                data={items}
                compact
                rowSelection={rowSelection}
                onRowSelectionChange={onRowSelectionChange}
                getRowId={getRowId}
            />
        </div>
    );
}
MemoSubTableInner.displayName = "MemoSubTable";

function shallowEqual(
    a: Record<string, boolean> | undefined,
    b: Record<string, boolean> | undefined
): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((k) => a[k] === b[k]);
}

import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const MemoSubTable = memo(
    MemoSubTableInner,
    <T,>(
        prev: {
            items: T[];
            columns: ColumnDef<T>[];
            rowSelection?: RowSelectionState;
            onRowSelectionChange?: OnChangeFn<RowSelectionState>;
            getRowId?: (row: T) => string;
        },
        next: {
            items: T[];
            columns: ColumnDef<T>[];
            rowSelection?: RowSelectionState;
            onRowSelectionChange?: OnChangeFn<RowSelectionState>;
            getRowId?: (row: T) => string;
        }
    ) =>
        prev.columns === next.columns &&
        prev.items.length === next.items.length &&
        prev.items.every((item, i) => item === next.items[i]) &&
        shallowEqual(prev.rowSelection, next.rowSelection) &&
        prev.onRowSelectionChange === next.onRowSelectionChange &&
        prev.getRowId === next.getRowId
) as <T>(props: {
    items: T[];
    columns: ColumnDef<T>[];
    rowSelection?: RowSelectionState;
    onRowSelectionChange?: OnChangeFn<RowSelectionState>;
    getRowId?: (row: T) => string;
}) => ReactNode;

export interface ExpanderLabels {
    show: string;
    hide: string;
}

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    loading?: boolean;
    renderSubComponent?: (row: Row<TData>) => ReactNode;
    getRowCanExpand?: (row: Row<TData>) => boolean;
    expanderLabels?: ExpanderLabels;
    compact?: boolean;
    rowSelection?: RowSelectionState;
    onRowSelectionChange?: OnChangeFn<RowSelectionState>;
    getRowId?: (row: TData) => string;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    loading = false,
    renderSubComponent,
    getRowCanExpand,
    expanderLabels,
    compact = false,
    rowSelection,
    onRowSelectionChange,
    getRowId,
}: DataTableProps<TData, TValue>) {
    const t = useTranslations("Cms.DataTable");
    const [expanded, setExpanded] = useState<ExpandedState>({});

    const hasSelection = onRowSelectionChange !== undefined;
    const effectiveRowSelection = rowSelection ?? {};
    const hasCustomSelectColumn = useMemo(() => columns.some((c) => c.id === "select"), [columns]);

    const selectColumn = useMemo<ColumnDef<TData>>(
        () => ({
            id: "select",
            header: () => null,
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                    className="border-foreground/30 data-[state=checked]:bg-foreground data-[state=checked]:border-foreground"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        }),
        []
    );

    const expanderColumn = useMemo<ColumnDef<TData>>(
        () => ({
            id: "expander",
            header: () => null,
            cell: ({ row }) =>
                row.getCanExpand() ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={row.getToggleExpandedHandler()}
                                className="text-muted-foreground hover:text-foreground flex h-6 w-6 items-center justify-center transition-colors"
                                type="button"
                            >
                                {row.getIsExpanded() ? (
                                    <ChevronDown className="h-4 w-4" />
                                ) : (
                                    <ChevronRight className="h-4 w-4" />
                                )}
                            </button>
                        </TooltipTrigger>
                        {expanderLabels && (
                            <TooltipContent>
                                {row.getIsExpanded() ? expanderLabels.hide : expanderLabels.show}
                            </TooltipContent>
                        )}
                    </Tooltip>
                ) : null,
        }),
        [expanderLabels]
    );

    // Build column list with correct ordering: [select] [expander] [data...]
    // When a custom select column is provided, the expander is inserted right after it.
    const allColumns = useMemo<ColumnDef<TData, TValue>[]>(() => {
        const withSelect =
            hasSelection && !hasCustomSelectColumn
                ? [selectColumn as ColumnDef<TData, TValue>, ...columns]
                : [...columns];

        if (!renderSubComponent) return withSelect;

        const selectIdx = withSelect.findIndex((c) => c.id === "select");
        const insertAt = selectIdx !== -1 ? selectIdx + 1 : 0;
        const result = [...withSelect];
        result.splice(insertAt, 0, expanderColumn as ColumnDef<TData, TValue>);
        return result;
    }, [
        columns,
        expanderColumn,
        hasCustomSelectColumn,
        hasSelection,
        renderSubComponent,
        selectColumn,
    ]);

    // @tanstack/react-table peer dep mismatch triggers this rule
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns: allColumns,
        getCoreRowModel: getCoreRowModel(),
        ...(getRowId && { getRowId }),
        state: {
            ...(renderSubComponent && { expanded }),
            ...(hasSelection && { rowSelection: effectiveRowSelection }),
        },
        ...(renderSubComponent && {
            getExpandedRowModel: getExpandedRowModel(),
            getRowCanExpand,
            onExpandedChange: setExpanded,
        }),
        ...(hasSelection && {
            onRowSelectionChange,
            enableRowSelection: true,
        }),
    });

    return (
        <TooltipProvider>
            <div className={cn("", compact ? "" : "")}>
                <Table className={compact ? "text-xs [&_tbody_tr]:border-0 [&_td]:py-1" : ""}>
                    <TableHeader className="bg-muted">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="bg-muted hover:bg-muted">
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className={cn(
                                            "bg-muted relative z-10 shadow-[0_1px_0_0_hsl(var(--border))]",
                                            compact ? "" : "sticky top-0",
                                            header.column.id === "select" ||
                                                header.column.id === "expander"
                                                ? "w-px px-2 py-2 whitespace-nowrap"
                                                : header.column.id === "actions"
                                                  ? "text-foreground px-3 py-2 text-right font-mono text-[10px] tracking-[1.2px] uppercase"
                                                  : "text-foreground max-w-[300px] px-3 py-2 font-mono text-[10px] tracking-[1.2px] break-words whitespace-normal uppercase"
                                        )}
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
                            table.getRowModel().rows.map((row, rowIndex) => (
                                <Fragment key={row.id}>
                                    <TableRow
                                        data-state={row.getIsSelected() ? "selected" : undefined}
                                        className={`hover:bg-foreground/[0.04] data-[state=selected]:bg-foreground/[0.06] border-0 transition-colors ${
                                            rowIndex % 2 === 1 ? "bg-secondary" : ""
                                        }`}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell
                                                key={cell.id}
                                                className={cn(
                                                    cell.column.id === "select" ||
                                                        cell.column.id === "expander"
                                                        ? "w-px px-2 whitespace-nowrap"
                                                        : cell.column.id === "actions"
                                                          ? "font-body px-3 py-2.5 text-right text-sm whitespace-nowrap"
                                                          : "font-body max-w-[300px] px-3 py-2.5 text-sm break-words whitespace-normal"
                                                )}
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                    {renderSubComponent && row.getIsExpanded() && (
                                        <TableRow className="border-0 hover:bg-transparent">
                                            <TableCell colSpan={allColumns.length} className="p-0">
                                                {renderSubComponent(row)}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </Fragment>
                            ))
                        ) : loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={`skeleton-${i}`} className="border-0">
                                    {table.getVisibleLeafColumns().map((col) => (
                                        <TableCell key={col.id} className="px-3 py-2.5">
                                            <Skeleton className="bg-foreground/10 h-4 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow className="border-0">
                                <TableCell colSpan={allColumns.length} className="h-32 text-center">
                                    <div className="text-muted-foreground font-mono text-xs tracking-wide">
                                        {t("noResults")}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </TooltipProvider>
    );
}
