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
        <div className="bg-muted/30 py-1 pr-6 pl-12">
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
    // useSuspenseQuery would normally handle this, but it suspends at the hook
    // call site, so primary + secondary queries (locations + halls, productions +
    // events) in the same component would both need to settle before anything
    // renders. This prop keeps the primary table visible while secondary data loads.
    loading?: boolean;
    renderSubComponent?: (row: Row<TData>) => ReactNode;
    getRowCanExpand?: (row: Row<TData>) => boolean;
    expanderLabels?: ExpanderLabels;
    compact?: boolean;
    toolbar?: ReactNode;
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
    toolbar,
    rowSelection,
    onRowSelectionChange,
    getRowId,
}: DataTableProps<TData, TValue>) {
    const t = useTranslations("Cms.DataTable");
    const [expanded, setExpanded] = useState<ExpandedState>({});

    // onRowSelectionChange alone determines whether selection is enabled.
    // rowSelection may be undefined when no items are selected yet (treated as {}).
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
        }),
        [expanderLabels]
    );

    const spacerColumn = useMemo<ColumnDef<TData, TValue>>(
        () => ({ id: "spacer", header: () => null, cell: () => null }),
        []
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

    const finalColumns = useMemo<ColumnDef<TData, TValue>[]>(() => {
        const actionsIdx = allColumns.findIndex((c) => c.id === "actions");
        const cols = [...allColumns];
        if (actionsIdx !== -1) {
            cols.splice(actionsIdx, 0, spacerColumn);
        } else {
            cols.push(spacerColumn);
        }
        return cols;
    }, [allColumns, spacerColumn]);

    // @tanstack/react-table peer dep mismatch triggers this rule
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns: finalColumns,
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
            <div className={compact ? undefined : "overflow-hidden rounded-md border"}>
                {toolbar !== undefined && <div className="border-b px-4 py-2">{toolbar}</div>}
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
                        ) : loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={`skeleton-${i}`}>
                                    {table.getVisibleLeafColumns().map((col) => (
                                        <TableCell key={col.id}>
                                            <Skeleton className="h-4 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={finalColumns.length}
                                    className="h-24 text-center"
                                >
                                    {t("noResults")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </TooltipProvider>
    );
}
