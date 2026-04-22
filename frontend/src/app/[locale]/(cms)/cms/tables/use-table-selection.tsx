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
    onJumpToEnd?: () => Promise<void>;
    useGlobal?: boolean;
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
    focusRow: (index: number) => void;
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
    onJumpToEnd,
    useGlobal = false,
}: UseTableSelectionOptions<TData>): UseTableSelectionReturn<TData> {
    const [focusedRowIndex, setFocusedRowIndex] = useState(-1);
    const [anchorRowId, setAnchorRowId] = useState<string | null>(null);
    const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());
    const lastKeyRef = useRef<{ key: string; time: number } | null>(null);

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

            onRowSelectionChange?.((prev) => {
                const next = { ...prev };
                for (let i = start; i <= end; i++) {
                    next[rows[i].id] = true;
                }
                return next;
            });
        },
        [rows, onRowSelectionChange]
    );

    const focusRow = useCallback((index: number) => {
        setFocusedRowIndex(index);
        const el = rowRefs.current.get(index);
        if (el) {
            el.focus();
        }
    }, []);

    const focusRowAt = useCallback((index: number) => {
        setFocusedRowIndex(index);
    }, []);

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
                    focusRow(rows.findIndex((r) => r.id === row.id));
                }
                return;
            }

            event.stopPropagation();
            event.preventDefault();

            const rowId = row.id;
            const rowIndex = rows.findIndex((r) => r.id === rowId);

            if (event.shiftKey && anchorRowId) {
                selectRange(anchorRowId, rowId);
                setAnchorRowId(rowId);
                focusRow(rowIndex);
            } else if (event.metaKey || event.ctrlKey) {
                toggleRow(rowId);
                setAnchorRowId(rowId);
                focusRow(rowIndex);
            } else {
                selectOnly(rowId);
                setAnchorRowId(rowId);
                focusRow(rowIndex);
            }
        },
        [enableSelection, rows, anchorRowId, selectRange, toggleRow, selectOnly, focusRow]
    );

    const processKeyEvent = useCallback(
        (event: KeyboardEvent) => {
            if (!enableSelection || rows.length === 0) return;

            const target = event.target as HTMLElement;
            const isTyping =
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable;

            if (isTyping) return;

            if (event.key === "ArrowDown" || event.key === "j") {
                event.preventDefault();
                const next =
                    focusedRowIndex === -1 ? 0 : Math.min(focusedRowIndex + 1, rows.length - 1);
                if (event.shiftKey && anchorRowId) {
                    selectRange(anchorRowId, rows[next].id);
                }
                focusRow(next);
            } else if (event.key === "ArrowUp" || event.key === "k") {
                event.preventDefault();
                const next = focusedRowIndex === -1 ? -1 : Math.max(focusedRowIndex - 1, 0);
                if (next >= 0 && event.shiftKey && anchorRowId) {
                    selectRange(anchorRowId, rows[next].id);
                }
                if (next >= 0) focusRow(next);
            } else if (event.key === "g") {
                const now = Date.now();
                if (lastKeyRef.current?.key === "g" && now - lastKeyRef.current.time < 500) {
                    event.preventDefault();
                    focusRow(0);
                    lastKeyRef.current = null;
                } else {
                    lastKeyRef.current = { key: "g", time: now };
                }
            } else if (event.key === "G") {
                event.preventDefault();
                if (onJumpToEnd) {
                    onJumpToEnd().then(() => {
                        focusRow(rows.length - 1);
                    });
                } else {
                    focusRow(rows.length - 1);
                }
            } else if (event.key === "v") {
                event.preventDefault();
                if (focusedRowIndex >= 0 && focusedRowIndex < rows.length) {
                    const row = rows[focusedRowIndex];
                    toggleRow(row.id);
                    setAnchorRowId(row.id);
                }
            } else if (event.key === " ") {
                event.preventDefault();
                if (focusedRowIndex === -1 && rows.length > 0) {
                    focusRow(0);
                    const row = rows[0];
                    toggleRow(row.id);
                    setAnchorRowId(row.id);
                } else if (focusedRowIndex >= 0 && focusedRowIndex < rows.length) {
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
                focusRow(0);
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
            focusRow,
            onJumpToEnd,
        ]
    );

    useEffect(() => {
        if (!useGlobal) return;
        window.addEventListener("keydown", processKeyEvent);
        return () => window.removeEventListener("keydown", processKeyEvent);
    }, [useGlobal, processKeyEvent]);

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            if (useGlobal) return;
            processKeyEvent(event.nativeEvent);
        },
        [useGlobal, processKeyEvent]
    );

    const getRowTabIndex = useCallback(
        (index: number) => (focusedRowIndex === index ? 0 : -1),
        [focusedRowIndex]
    );

    const isRowFocused = useCallback(
        (index: number) => focusedRowIndex === index,
        [focusedRowIndex]
    );

    return {
        focusedRowIndex,
        anchorRowId,
        handleRowClick,
        handleRowMouseDown,
        handleKeyDown,
        getRowTabIndex,
        isRowFocused,
        focusRowAt,
        focusRow,
        rowRefCallback,
    };
}
