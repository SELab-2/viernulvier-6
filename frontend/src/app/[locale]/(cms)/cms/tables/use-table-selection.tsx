"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Row, RowSelectionState } from "@tanstack/react-table";

interface UseTableSelectionOptions<TData> {
    rows: Row<TData>[];
    rowSelection: RowSelectionState;
    onRowSelectionChange?: (
        updater: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)
    ) => void;
    enableSelection: boolean;
}

interface UseTableSelectionReturn<TData> {
    focusedRowIndex: number;
    anchorRowId: string | null;
    handleRowClick: (row: Row<TData>, event: React.MouseEvent) => void;
    handleRowMouseDown: (event: React.MouseEvent) => void;
    handleKeyDown: (event: React.KeyboardEvent) => void;
    getRowTabIndex: (index: number) => number;
    isRowFocused: (index: number) => boolean;
    focusRowAt: (index: number) => void;
    rowRefCallback: (index: number) => (el: HTMLTableRowElement | null) => void;
}

/**
 * Professional table selection hook supporting:
 * - ArrowUp / ArrowDown: move focus
 * - Space: toggle selection of focused row
 * - Shift + ArrowUp / ArrowDown: extend selection range
 * - Click: single select (set anchor)
 * - Ctrl/Cmd + Click: toggle individual row
 * - Shift + Click: select range from anchor
 * - Escape: clear all selection
 * - Ctrl/Cmd + A: select all rows
 */
export function useTableSelection<TData>({
    rows,
    onRowSelectionChange,
    enableSelection,
}: UseTableSelectionOptions<TData>): UseTableSelectionReturn<TData> {
    const [focusedRowIndex, setFocusedRowIndex] = useState(-1);
    const [anchorRowId, setAnchorRowId] = useState<string | null>(null);
    const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());

    const rowRefCallback = useCallback(
        (index: number) => (el: HTMLTableRowElement | null) => {
            if (el) {
                rowRefs.current.set(index, el);
            } else {
                rowRefs.current.delete(index);
            }
        },
        []
    );

    // Scroll focused row into view
    useEffect(() => {
        if (focusedRowIndex >= 0) {
            const el = rowRefs.current.get(focusedRowIndex);
            if (el) {
                el.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
        }
    }, [focusedRowIndex]);

    const selectOnly = useCallback(
        (rowId: string) => {
            onRowSelectionChange?.({ [rowId]: true });
        },
        [onRowSelectionChange]
    );

    const toggleRow = useCallback(
        (rowId: string) => {
            onRowSelectionChange?.((prev) => {
                const next = { ...prev };
                if (next[rowId]) {
                    delete next[rowId];
                } else {
                    next[rowId] = true;
                }
                return next;
            });
        },
        [onRowSelectionChange]
    );

    const selectRange = useCallback(
        (anchorId: string, targetId: string) => {
            const anchorIdx = rows.findIndex((r) => r.id === anchorId);
            const targetIdx = rows.findIndex((r) => r.id === targetId);
            if (anchorIdx === -1 || targetIdx === -1) return;

            const start = Math.min(anchorIdx, targetIdx);
            const end = Math.max(anchorIdx, targetIdx);

            const next: RowSelectionState = {};
            for (let i = start; i <= end; i++) {
                next[rows[i].id] = true;
            }
            onRowSelectionChange?.(next);
        },
        [rows, onRowSelectionChange]
    );

    const clearSelection = useCallback(() => {
        onRowSelectionChange?.({});
        setAnchorRowId(null);
        setFocusedRowIndex(-1);
    }, [onRowSelectionChange]);

    const handleRowMouseDown = useCallback(
        (event: React.MouseEvent) => {
            if (!enableSelection) return;
            if (event.shiftKey) {
                event.preventDefault();
            }
        },
        [enableSelection]
    );

    const handleRowClick = useCallback(
        (row: Row<TData>, event: React.MouseEvent) => {
            if (!enableSelection) return;

            const target = event.target as HTMLElement;
            if (target.closest('button, a, [role="checkbox"], input, label')) {
                if (target.closest('[role="checkbox"]') || target.closest("label")) {
                    setAnchorRowId(row.id);
                    setFocusedRowIndex(rows.findIndex((r) => r.id === row.id));
                }
                return;
            }

            event.stopPropagation();
            event.preventDefault();

            const rowId = row.id;
            const rowIndex = rows.findIndex((r) => r.id === rowId);

            if (event.shiftKey && anchorRowId) {
                selectRange(anchorRowId, rowId);
                setFocusedRowIndex(rowIndex);
            } else if (event.metaKey || event.ctrlKey) {
                toggleRow(rowId);
                setAnchorRowId(rowId);
                setFocusedRowIndex(rowIndex);
            } else {
                selectOnly(rowId);
                setAnchorRowId(rowId);
                setFocusedRowIndex(rowIndex);
            }
        },
        [enableSelection, rows, anchorRowId, selectRange, toggleRow, selectOnly]
    );

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            if (!enableSelection || rows.length === 0) return;

            if (event.key === "ArrowDown") {
                event.preventDefault();
                setFocusedRowIndex((prev) => {
                    const next = prev >= 0 ? Math.min(prev + 1, rows.length - 1) : 0;
                    if (event.shiftKey && anchorRowId) {
                        selectRange(anchorRowId, rows[next].id);
                    }
                    return next;
                });
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setFocusedRowIndex((prev) => {
                    const next = prev >= 0 ? Math.max(prev - 1, 0) : 0;
                    if (event.shiftKey && anchorRowId) {
                        selectRange(anchorRowId, rows[next].id);
                    }
                    return next;
                });
            } else if (event.key === " ") {
                event.preventDefault();
                if (focusedRowIndex >= 0 && focusedRowIndex < rows.length) {
                    const row = rows[focusedRowIndex];
                    if (event.shiftKey && anchorRowId) {
                        selectRange(anchorRowId, row.id);
                    } else {
                        toggleRow(row.id);
                        setAnchorRowId(row.id);
                    }
                }
            } else if (event.key === "Escape") {
                event.preventDefault();
                clearSelection();
            } else if (event.key === "a" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                const next: RowSelectionState = {};
                for (const r of rows) {
                    next[r.id] = true;
                }
                onRowSelectionChange?.(next);
                setAnchorRowId(rows[0]?.id ?? null);
                setFocusedRowIndex(0);
            }
        },
        [
            enableSelection,
            rows,
            focusedRowIndex,
            anchorRowId,
            selectRange,
            toggleRow,
            clearSelection,
            onRowSelectionChange,
        ]
    );

    const getRowTabIndex = useCallback(
        (index: number) => (focusedRowIndex === index ? 0 : -1),
        [focusedRowIndex]
    );

    const isRowFocused = useCallback(
        (index: number) => focusedRowIndex === index,
        [focusedRowIndex]
    );

    const focusRowAt = useCallback((index: number) => {
        setFocusedRowIndex(index);
    }, []);

    return {
        focusedRowIndex,
        anchorRowId,
        handleRowClick,
        handleRowMouseDown,
        handleKeyDown,
        getRowTabIndex,
        isRowFocused,
        focusRowAt,
        rowRefCallback,
    };
}
