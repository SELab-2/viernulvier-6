import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { ColumnDef, OnChangeFn, Row, RowSelectionState } from "@tanstack/react-table";

import type { SetStateAction } from "react";

export function useParentChildSelection<TParent extends { id: string }>(
    childrenByParentId: Map<string, { id: string }[]>
): {
    parentSelection: RowSelectionState;
    setParentSelection: (updater: SetStateAction<RowSelectionState>) => void;
    childSelection: Map<string, RowSelectionState>;
    childSelectionRef: MutableRefObject<Map<string, RowSelectionState>>;
    getChildHandler: (parentId: string) => OnChangeFn<RowSelectionState>;
    selectColumn: ColumnDef<TParent>;
    selectedParentCount: number;
    selectedChildCount: number;
    selectionVersion: number;
    clearSelection: () => void;
} {
    const [parentSelection, setParentSelectionState] = useState<RowSelectionState>({});
    const [childSelection, setChildSelection] = useState<Map<string, RowSelectionState>>(new Map());
    const [selectionVersion, setSelectionVersion] = useState(0);

    // Use refs to access latest state without triggering re-renders of the column definition
    const parentSelectionRef = useRef(parentSelection);
    const childSelectionRef = useRef(childSelection);
    const childrenByParentIdRef = useRef(childrenByParentId);
    useEffect(() => {
        parentSelectionRef.current = parentSelection;
    }, [parentSelection]);
    useEffect(() => {
        childSelectionRef.current = childSelection;
    }, [childSelection]);
    useEffect(() => {
        childrenByParentIdRef.current = childrenByParentId;
    }, [childrenByParentId]);

    const setParentSelection = useCallback((updater: SetStateAction<RowSelectionState>) => {
        const previousParentSelection = parentSelectionRef.current;
        const nextParentSelection =
            typeof updater === "function" ? updater(previousParentSelection) : updater;

        parentSelectionRef.current = nextParentSelection;
        setParentSelectionState(nextParentSelection);

        const changedParentIds = [
            ...new Set([
                ...Object.keys(previousParentSelection),
                ...Object.keys(nextParentSelection),
            ]),
        ].filter(
            (parentId) =>
                Boolean(previousParentSelection[parentId]) !==
                Boolean(nextParentSelection[parentId])
        );

        if (changedParentIds.length === 0) return;

        setChildSelection((previousChildSelection) => {
            const nextChildSelection = new Map(previousChildSelection);

            for (const parentId of changedParentIds) {
                const children = childrenByParentIdRef.current.get(parentId) ?? [];
                nextChildSelection.set(
                    parentId,
                    nextParentSelection[parentId]
                        ? Object.fromEntries(children.map((child) => [child.id, true]))
                        : {}
                );
            }

            childSelectionRef.current = nextChildSelection;
            return nextChildSelection;
        });
        setSelectionVersion((version) => version + 1);
    }, []);

    // Stable per-parent child selection handlers. Created once per parentId and cached
    // in a ref. We also eagerly update the childSelectionRef so the selectColumn cell
    // renderer sees the latest childSelection during the same render cycle (useEffect
    // runs after render, which is too late for the indeterminate check).
    const childHandlersRef = useRef<Map<string, OnChangeFn<RowSelectionState>>>(new Map());
    const getChildHandler = useCallback((parentId: string): OnChangeFn<RowSelectionState> => {
        let handler = childHandlersRef.current.get(parentId);
        if (!handler) {
            handler = (updater) => {
                setChildSelection((prev) => {
                    const current = prev.get(parentId) ?? {};
                    const next = typeof updater === "function" ? updater(current) : updater;
                    const newMap = new Map(prev).set(parentId, next);
                    childSelectionRef.current = newMap;
                    setSelectionVersion((version) => version + 1);
                    return newMap;
                });
            };
            childHandlersRef.current.set(parentId, handler);
        }
        return handler;
    }, []);

    // Stable select column - never recreate the column definition.
    // We deliberately keep the deps empty so TanStack Table does not re-initialise the table.

    const selectColumn = useMemo<ColumnDef<TParent>>(
        () => ({
            id: "select",
            header: () => null,
            cell: ({ row, _sel }: { row: Row<TParent>; _sel?: boolean }) => {
                const parentId = row.original.id;
                // Read from refs to get latest state without re-rendering
                const childSel = childSelectionRef.current.get(parentId) ?? {};
                const selectedChildCount = Object.values(childSel).filter(Boolean).length;
                const isChecked = _sel ?? Boolean(parentSelectionRef.current[parentId]);
                const isIndeterminate = !isChecked && selectedChildCount > 0;
                const isActive = isChecked || isIndeterminate;

                return (
                    <div
                        role="checkbox"
                        aria-checked={isIndeterminate ? "mixed" : isChecked}
                        className={`flex size-4 items-center justify-center border ${
                            isActive
                                ? "border-foreground bg-foreground text-background"
                                : "border-foreground/30"
                        }`}
                    >
                        {isActive && (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        )}
                    </div>
                );
            },
            enableSorting: false,
            enableHiding: false,
        }),
        [] // Never recreate - use refs for all dynamic values
    );

    const selectedParentCount = Object.values(parentSelection).filter(Boolean).length;
    const selectedChildCount = Array.from(childSelection.values()).reduce(
        (sum, sel) => sum + Object.values(sel).filter(Boolean).length,
        0
    );

    const clearSelection = useCallback(() => {
        setParentSelection({});
        const empty = new Map();
        setChildSelection(empty);
        childSelectionRef.current = empty;
        setSelectionVersion((version) => version + 1);
    }, [setParentSelection]);

    return {
        parentSelection,
        setParentSelection,
        childSelection,
        childSelectionRef,
        getChildHandler,
        selectColumn,
        selectedParentCount,
        selectedChildCount,
        selectionVersion,
        clearSelection,
    };
}
