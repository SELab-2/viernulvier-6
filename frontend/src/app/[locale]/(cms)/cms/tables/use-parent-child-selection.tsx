import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef, OnChangeFn, RowSelectionState } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
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
    // in a ref.
    const childHandlersRef = useRef<Map<string, OnChangeFn<RowSelectionState>>>(new Map());
    const getChildHandler = useCallback((parentId: string): OnChangeFn<RowSelectionState> => {
        let handler = childHandlersRef.current.get(parentId);
        if (!handler) {
            handler = (updater) => {
                setChildSelection((prev) => {
                    const current = prev.get(parentId) ?? {};
                    const next = typeof updater === "function" ? updater(current) : updater;
                    return new Map(prev).set(parentId, next);
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

    // Stable select column - never recreate the column definition
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
                const children = childrenByParentIdRef.current.get(parentId) ?? [];
                const handleChildSelect = getChildHandlerRef.current;

                return (
                    <Checkbox
                        checked={isChecked ? true : isIndeterminate ? "indeterminate" : false}
                        onCheckedChange={(value) => {
                            row.toggleSelected(!!value);
                            handleChildSelect(parentId)(
                                value ? Object.fromEntries(children.map((c) => [c.id, true])) : {}
                            );
                        }}
                        aria-label="Select row"
                    />
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
