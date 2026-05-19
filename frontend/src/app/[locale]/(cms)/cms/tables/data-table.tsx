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
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import {
    Fragment,
    ReactNode,
    memo,
    useCallback,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { useTableSelection } from "./use-table-selection";

// Generic memoized subtable that only rerenders when its own row items or selection changes.
// TanStack Query structural sharing ensures unchanged items keep their reference,
// so the element-level comparator correctly skips rerenders for unaffected rows.
function MemoSubTableInner<T>({
    items,
    columns,
    rowSelection,
    onRowSelectionChange,
    getRowId,
    rowRenderVersion,
}: {
    items: T[];
    columns: ColumnDef<T>[];
    rowSelection?: RowSelectionState;
    onRowSelectionChange?: OnChangeFn<RowSelectionState>;
    getRowId?: (row: T) => string;
    rowRenderVersion?: number;
}) {
    return (
        <div className="border-border/80 bg-foreground/[0.02] py-1 pr-6 pl-14">
            <DataTable
                columns={columns}
                data={items}
                compact
                rowSelection={rowSelection}
                onRowSelectionChange={onRowSelectionChange}
                getRowId={getRowId}
                rowRenderVersion={rowRenderVersion}
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
            rowRenderVersion?: number;
        },
        next: {
            items: T[];
            columns: ColumnDef<T>[];
            rowSelection?: RowSelectionState;
            onRowSelectionChange?: OnChangeFn<RowSelectionState>;
            getRowId?: (row: T) => string;
            rowRenderVersion?: number;
        }
    ) =>
        prev.columns === next.columns &&
        prev.items.length === next.items.length &&
        prev.items.every((item, i) => item === next.items[i]) &&
        shallowEqual(prev.rowSelection, next.rowSelection) &&
        prev.onRowSelectionChange === next.onRowSelectionChange &&
        prev.getRowId === next.getRowId &&
        prev.rowRenderVersion === next.rowRenderVersion
) as <T>(props: {
    items: T[];
    columns: ColumnDef<T>[];
    rowSelection?: RowSelectionState;
    onRowSelectionChange?: OnChangeFn<RowSelectionState>;
    getRowId?: (row: T) => string;
    rowRenderVersion?: number;
}) => ReactNode;

// Memoized table row that only re-renders when its selection, focus, or data changes.
// This prevents 7999 rows from re-rendering when a single row is toggled.
interface MemoTableRowProps<TData> {
    row: Row<TData>;
    rowIndex: number;
    isSelected: boolean;
    isExpanded: boolean;
    isFocused: boolean;
    tabIndex: number;
    hasSelection: boolean;
    handleRowClick: (row: Row<TData>, event: React.MouseEvent) => void;
    handleRowMouseDown: (event: React.MouseEvent) => void;
    onRowClick?: (row: TData) => void;
    rowRefCallback: (index: number) => (el: HTMLTableRowElement | null) => void;
    allColumnsLength: number;
    rowRenderVersion?: number;
    renderSubComponent?: (row: Row<TData>) => ReactNode;
    focusRowAt: (index: number) => void;
}

function MemoTableRowInner<TData>({
    row,
    rowIndex,
    isSelected,
    isExpanded,
    isFocused,
    tabIndex,
    hasSelection,
    handleRowClick,
    handleRowMouseDown,
    onRowClick,
    rowRefCallback,
    allColumnsLength,
    renderSubComponent,
    focusRowAt,
}: MemoTableRowProps<TData>) {
    // Stable ref for row so onRowClickHandler doesn't recreate when
    // TanStack recycles row objects across table instance recreations.
    const rowRef = useRef(row);
    useLayoutEffect(() => {
        rowRef.current = row;
    });

    const onRowClickHandler = useCallback(
        (e: React.MouseEvent) => {
            if (hasSelection) {
                handleRowClick(rowRef.current, e);
            } else {
                onRowClick?.(rowRef.current.original);
            }
        },
        [hasSelection, handleRowClick, onRowClick]
    );

    const onRowMouseEnter = useCallback(() => focusRowAt(rowIndex), [focusRowAt, rowIndex]);
    const onRowMouseLeave = useCallback(() => focusRowAt(-1), [focusRowAt]);

    return (
        <Fragment>
            <TableRow
                ref={rowRefCallback(rowIndex)}
                tabIndex={tabIndex}
                data-state={isSelected ? "selected" : undefined}
                data-focused={isFocused ? "true" : undefined}
                aria-selected={hasSelection ? isSelected : undefined}
                className={cn(
                    "border-0 transition-colors outline-none",
                    "data-[state=selected]:bg-foreground/[0.18]",
                    "data-[focused=true]:bg-foreground/[0.12] data-[state=selected]:data-[focused=true]:bg-foreground/[0.22]",
                    "hover:bg-foreground/[0.06] data-[state=selected]:hover:bg-foreground/[0.24]",
                    rowIndex % 2 === 1 && !isSelected ? "bg-secondary" : "",
                    onRowClick && !hasSelection ? "cursor-pointer" : "",
                    hasSelection ? "cursor-pointer" : ""
                )}
                onClick={onRowClickHandler}
                onMouseEnter={onRowMouseEnter}
                onMouseLeave={onRowMouseLeave}
                onMouseDown={handleRowMouseDown}
            >
                {row.getVisibleCells().map((cell) => (
                    <TableCell
                        key={cell.id}
                        className={cn(
                            cell.column.id === "select" || cell.column.id === "expander"
                                ? "w-px px-2 whitespace-nowrap"
                                : cell.column.id === "actions"
                                  ? "font-body px-3 py-2.5 text-right text-sm whitespace-nowrap"
                                  : "font-body max-w-[300px] px-3 py-2.5 text-sm break-words whitespace-normal"
                        )}
                    >
                        {flexRender(cell.column.columnDef.cell, {
                            ...cell.getContext(),
                            _sel: isSelected,
                        })}
                    </TableCell>
                ))}
            </TableRow>
            {renderSubComponent && isExpanded && (
                <TableRow className="border-0 hover:bg-transparent">
                    <TableCell colSpan={allColumnsLength} className="p-0">
                        {renderSubComponent(row)}
                    </TableCell>
                </TableRow>
            )}
        </Fragment>
    );
}

const MemoTableRow = memo(
    MemoTableRowInner,
    (prev, next) =>
        prev.row.original === next.row.original &&
        prev.isSelected === next.isSelected &&
        prev.isExpanded === next.isExpanded &&
        prev.isFocused === next.isFocused &&
        prev.tabIndex === next.tabIndex &&
        prev.hasSelection === next.hasSelection &&
        prev.allColumnsLength === next.allColumnsLength &&
        prev.rowRenderVersion === next.rowRenderVersion &&
        prev.handleRowClick === next.handleRowClick &&
        prev.handleRowMouseDown === next.handleRowMouseDown &&
        prev.onRowClick === next.onRowClick &&
        prev.rowRefCallback === next.rowRefCallback &&
        prev.renderSubComponent === next.renderSubComponent &&
        prev.focusRowAt === next.focusRowAt &&
        prev.rowIndex === next.rowIndex
) as <TData>(props: MemoTableRowProps<TData>) => ReactNode;

export interface ExpanderLabels {
    show: string;
    hide: string;
}

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    loading?: boolean;
    renderSubComponent?: (row: Row<TData>) => ReactNode;
    // Alias for renderSubComponent for backwards compatibility
    renderSubRows?: (row: Row<TData>) => ReactNode;
    getRowCanExpand?: (row: Row<TData>) => boolean;
    expanderLabels?: ExpanderLabels;
    compact?: boolean;
    rowSelection?: RowSelectionState;
    onRowSelectionChange?: OnChangeFn<RowSelectionState>;
    expanded?: ExpandedState;
    onExpandedChange?: OnChangeFn<ExpandedState>;
    getRowId?: (row: TData) => string;
    onRowClick?: (row: TData) => void;
    onJumpToEnd?: () => Promise<void>;
    rowRenderVersion?: number;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    loading = false,
    renderSubComponent: renderSubComponentProp,
    renderSubRows,
    getRowCanExpand,
    expanderLabels,
    compact = false,
    rowSelection,
    onRowSelectionChange,
    expanded: expandedProp,
    onExpandedChange: onExpandedChangeProp,
    getRowId,
    onRowClick,
    onJumpToEnd,
    rowRenderVersion,
}: DataTableProps<TData, TValue>) {
    const t = useTranslations("Cms.DataTable");
    const [expandedInternal, setExpandedInternal] = useState<ExpandedState>({});
    const expanded = expandedProp !== undefined ? expandedProp : expandedInternal;
    const onExpandedChange =
        onExpandedChangeProp !== undefined ? onExpandedChangeProp : setExpandedInternal;

    // Support both renderSubComponent and renderSubRows for backwards compatibility
    const renderSubComponent = renderSubComponentProp ?? renderSubRows;

    const hasSelection = onRowSelectionChange !== undefined;
    const effectiveRowSelection = rowSelection ?? {};
    const hasCustomSelectColumn = useMemo(() => columns.some((c) => c.id === "select"), [columns]);

    const selectColumn = useMemo<ColumnDef<TData>>(
        () => ({
            id: "select",
            header: () => null,
            cell: ({ row, _sel }: { row: Row<TData>; _sel?: boolean }) => {
                const selected = _sel ?? row.getIsSelected();
                return (
                    <div
                        role="checkbox"
                        aria-checked={selected}
                        className={cn(
                            "flex size-4 items-center justify-center border",
                            selected
                                ? "border-foreground bg-foreground text-background"
                                : "border-foreground/30"
                        )}
                    >
                        {selected && <Check className="size-3.5" />}
                    </div>
                );
            },
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
            onExpandedChange,
        }),
        ...(hasSelection && {
            onRowSelectionChange,
            enableRowSelection: true,
        }),
    });

    const visibleRows = table.getRowModel().rows;

    const {
        handleRowClick,
        handleRowMouseDown,
        handleKeyDown,
        isRowFocused,
        focusRowAt,
        rowRefCallback,
    } = useTableSelection({
        rows: visibleRows,
        rowSelection: effectiveRowSelection,
        onRowSelectionChange,
        enableSelection: hasSelection,
        onJumpToEnd,
        useGlobal: !compact,
    });

    return (
        <TooltipProvider>
            <div
                className={cn("outline-none", compact ? "" : "")}
                onKeyDown={handleKeyDown}
                onMouseLeave={() => focusRowAt(-1)}
                tabIndex={hasSelection ? 0 : -1}
                role={hasSelection ? "grid" : undefined}
                aria-multiselectable={hasSelection ? true : undefined}
            >
                <Table className={compact ? "text-xs [&_tbody_tr]:border-0 [&_td]:py-1" : ""}>
                    <TableHeader className="bg-muted">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="bg-muted hover:bg-muted">
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className={cn(
                                            "bg-muted text-foreground relative z-20 shadow-[0_1px_0_0_hsl(var(--border))]",
                                            compact ? "" : "sticky top-0",
                                            header.column.id === "select"
                                                ? "w-px px-4 py-2 whitespace-nowrap"
                                                : header.column.id === "expander"
                                                  ? "w-px px-2 py-2 whitespace-nowrap"
                                                  : header.column.id === "actions"
                                                    ? "px-3 py-2 text-right font-mono text-[10px] tracking-[1.2px] uppercase"
                                                    : "max-w-[300px] px-3 py-2 font-mono text-[10px] tracking-[1.2px] break-words whitespace-normal uppercase"
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
                        {visibleRows.length ? (
                            visibleRows.map((row, rowIndex) => (
                                <MemoTableRow
                                    key={`${row.id}-${row.getIsExpanded() ? "e" : "c"}`}
                                    row={row}
                                    rowIndex={rowIndex}
                                    isSelected={row.getIsSelected()}
                                    isExpanded={row.getIsExpanded()}
                                    isFocused={isRowFocused(rowIndex)}
                                    tabIndex={isRowFocused(rowIndex) ? 0 : -1}
                                    hasSelection={hasSelection}
                                    handleRowClick={handleRowClick}
                                    handleRowMouseDown={handleRowMouseDown}
                                    onRowClick={onRowClick}
                                    rowRefCallback={rowRefCallback}
                                    allColumnsLength={allColumns.length}
                                    rowRenderVersion={rowRenderVersion}
                                    renderSubComponent={renderSubComponent}
                                    focusRowAt={focusRowAt}
                                />
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
