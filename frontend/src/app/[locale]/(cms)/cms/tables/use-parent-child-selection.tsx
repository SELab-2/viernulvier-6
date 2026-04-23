import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef, OnChangeFn, RowSelectionState } from "@tanstack/react-table";

import type { Dispatch, SetStateAction } from "react";

export function useParentChildSelection<TParent extends { id: string }>(
    childrenByParentId: Map<string, { id: string }[]>
): {
    parentSelection: RowSelectionState;
    setParentSelection: Dispatch<SetStateAction<RowSelectionState>>;
    childSelection: Map<string, RowSelectionState>;
    getChildHandler: (parentId: string) => OnChangeFn<RowSelectionState>;
    selectColumn: ColumnDef<TParent>;
    selectedParentCount: number;
    selectedChildCount: number;
    clearSelection: () => void;
} {
    const [parentSelection, setParentSelection] = useState<RowSelectionState>({});
    const [childSelection, setChildSelection] = useState<Map<string, RowSelectionState>>(new Map());
    // Force re-render counter used to give select cells a changing key so React
    // never skips re-rendering them after a selection toggle.
    const [toggleRev, setToggleRev] = useState(0);

    // Use refs to access latest state without triggering re-renders of the column definition
    const childSelectionRef = useRef(childSelection);
    const childrenByParentIdRef = useRef(childrenByParentId);
    useEffect(() => {
        childSelectionRef.current = childSelection;
    }, [childSelection]);
    useEffect(() => {
        childrenByParentIdRef.current = childrenByParentId;
    }, [childrenByParentId]);

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
                    return newMap;
                });
            };
            childHandlersRef.current.set(parentId, handler);
        }
        return handler;
    }, []);

    // Stable reference to getChildHandler
    const getChildHandlerRef = useRef(getChildHandler);
    useEffect(() => {
        getChildHandlerRef.current = getChildHandler;
    }, [getChildHandler]);

    // Stable select column - never recreate the column definition.
    // toggleRev is read inside the cell renderer via closure; we deliberately
    // keep the deps empty so TanStack Table does not re-initialise the table.

    const selectColumn = useMemo<ColumnDef<TParent>>(
        () => ({
            id: "select",
            header: () => null,
            cell: ({ row }) => {
                const parentId = row.original.id;
                // Read from refs to get latest state without re-rendering
                const childSel = childSelectionRef.current.get(parentId) ?? {};
                const selectedChildCount = Object.values(childSel).filter(Boolean).length;
                const isChecked = row.getIsSelected();
                const isIndeterminate = !isChecked && selectedChildCount > 0;

                return (
                    <div
                        key={`sel-${toggleRev}`}
                        className={`flex size-4 items-center justify-center border ${
                            isChecked || isIndeterminate
                                ? "border-foreground bg-foreground text-background"
                                : "border-foreground/30"
                        }`}
                        aria-hidden="true"
                        onClick={(e) => {
                            e.stopPropagation();
                            const nextChecked = !row.getIsSelected();
                            row.toggleSelected(nextChecked);
                            const children = childrenByParentIdRef.current.get(parentId) ?? [];
                            const handleChildSelect = getChildHandlerRef.current;
                            const nextChildSel = nextChecked
                                ? Object.fromEntries(children.map((c) => [c.id, true]))
                                : {};
                            handleChildSelect(parentId)(nextChildSel);
                            // Bump rev so the cell key changes and React repaints the checkbox immediately
                            setToggleRev((r) => r + 1);
                        }}
                    >
                        {(isChecked || isIndeterminate) && (
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
        setChildSelection(new Map());
    }, []);

    return {
        parentSelection,
        setParentSelection,
        childSelection,
        getChildHandler,
        selectColumn,
        selectedParentCount,
        selectedChildCount,
        clearSelection,
    };
}
