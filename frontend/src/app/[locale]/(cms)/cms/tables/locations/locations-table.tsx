"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { ColumnDef, OnChangeFn, Row, RowSelectionState } from "@tanstack/react-table";
import { DataTable, MemoSubTable } from "../data-table";
import { EditSheet } from "../edit-sheet";
import { SelectionToolbar } from "../selection-toolbar";
import { makeLocationColumns, locationFields, toLocationUpdateInput } from "./columns";
import { makeHallColumns, hallFields, toHallUpdateInput } from "./hall-columns";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
import { useGetLocations, useUpdateLocation } from "@/hooks/api/useLocations";
import { useGetHalls, useUpdateHall } from "@/hooks/api/useHalls";
import type { Location } from "@/types/models/location.types";
import type { Hall } from "@/types/models/hall.types";

export function LocationsTable() {
    const t = useTranslations("Cms.Locations");
    const { data: locations = [], isLoading: locationsLoading } = useGetLocations();
    const { data: allHalls = [], isLoading: hallsLoading } = useGetHalls();
    const updateLocation = useUpdateLocation();
    const updateHall = useUpdateHall();

    const [editLocation, setEditLocation] = useState<Location | null>(null);
    const [editHall, setEditHall] = useState<Hall | null>(null);

    // Selection state: parent rows (locations) and child rows (halls per location)
    const [parentSelection, setParentSelection] = useState<RowSelectionState>({});
    const [childSelection, setChildSelection] = useState<Map<string, RowSelectionState>>(new Map());

    const hallsBySpace = useMemo(() => {
        const map = new Map<string, Hall[]>();
        for (const hall of allHalls) {
            if (!hall.spaceId) continue;
            const list = map.get(hall.spaceId) ?? [];
            list.push(hall);
            map.set(hall.spaceId, list);
        }
        return map;
    }, [allHalls]);

    // Stable per-location child selection handlers. Created once per locationId
    // and cached in a ref — avoids new function references on every selection change,
    // which would defeat MemoSubTable's memo comparator for the onRowSelectionChange check.
    const childHandlersRef = useRef<Map<string, OnChangeFn<RowSelectionState>>>(new Map());
    const getChildHandler = useCallback(
        (locationId: string): OnChangeFn<RowSelectionState> => {
            let handler = childHandlersRef.current.get(locationId);
            if (!handler) {
                handler = (updater) => {
                    setChildSelection((prev) => {
                        const current = prev.get(locationId) ?? {};
                        const next = typeof updater === "function" ? updater(current) : updater;
                        return new Map(prev).set(locationId, next);
                    });
                };
                childHandlersRef.current.set(locationId, handler);
            }
            return handler;
        },
        [] // setChildSelection setter is stable; locationId is baked into each handler closure
    );

    // Custom select column for locations: tree-selection with indeterminate support.
    const selectColumn = useMemo<ColumnDef<Location>>(
        () => ({
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllRowsSelected() ||
                        (table.getIsSomeRowsSelected() ? "indeterminate" : false)
                    }
                    onCheckedChange={(value) => {
                        table.toggleAllRowsSelected(!!value);
                        if (value) {
                            const next = new Map<string, RowSelectionState>();
                            for (const location of locations) {
                                const halls = hallsBySpace.get(location.id) ?? [];
                                next.set(
                                    location.id,
                                    Object.fromEntries(halls.map((h) => [h.id, true]))
                                );
                            }
                            setChildSelection(next);
                        } else {
                            setChildSelection(new Map());
                        }
                    }}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => {
                const locationId = row.original.id;
                const childSel = childSelection.get(locationId) ?? {};
                const selectedChildCount = Object.values(childSel).filter(Boolean).length;
                const isChecked = row.getIsSelected();
                const isIndeterminate = !isChecked && selectedChildCount > 0;

                return (
                    <Checkbox
                        checked={isChecked ? true : isIndeterminate ? "indeterminate" : false}
                        onCheckedChange={(value) => {
                            row.toggleSelected(!!value);
                            getChildHandler(locationId)(
                                value
                                    ? Object.fromEntries(
                                          (hallsBySpace.get(locationId) ?? []).map((h) => [
                                              h.id,
                                              true,
                                          ])
                                      )
                                    : {}
                            );
                        }}
                        aria-label="Select row"
                    />
                );
            },
            enableSorting: false,
            enableHiding: false,
        }),
        [childSelection, getChildHandler, hallsBySpace, locations]
    );

    const locationCols = useMemo(
        () => [selectColumn, ...makeLocationColumns({ onEdit: setEditLocation })],
        [selectColumn]
    );

    const hallCols = useMemo(() => makeHallColumns({ onEdit: setEditHall }), []);

    const getHallRowId = useCallback((row: Hall) => row.id, []);

    const renderHalls = useCallback(
        (row: Row<Location>) => {
            if (hallsLoading) {
                return (
                    <div className="bg-muted/30 flex items-center py-1 pr-6 pl-12">
                        <Spinner className="text-muted-foreground size-3" />
                    </div>
                );
            }
            const locationId = row.original.id;
            const halls = hallsBySpace.get(locationId) ?? [];
            return (
                <MemoSubTable
                    items={halls}
                    columns={hallCols}
                    rowSelection={childSelection.get(locationId)}
                    onRowSelectionChange={getChildHandler(locationId)}
                    getRowId={getHallRowId}
                />
            );
        },
        [childSelection, getChildHandler, getHallRowId, hallCols, hallsBySpace, hallsLoading]
    );

    const selectedLocationCount = Object.values(parentSelection).filter(Boolean).length;
    const selectedHallCount = Array.from(childSelection.values()).reduce(
        (sum, sel) => sum + Object.values(sel).filter(Boolean).length,
        0
    );

    const clearSelection = useCallback(() => {
        setParentSelection({});
        setChildSelection(new Map());
    }, []);

    return (
        <>
            <DataTable
                columns={locationCols}
                data={locations}
                loading={locationsLoading}
                renderSubComponent={renderHalls}
                getRowCanExpand={(row) => (hallsBySpace.get(row.original.id)?.length ?? 0) > 0}
                expanderLabels={{ show: t("showHalls"), hide: t("hideHalls") }}
                toolbar={
                    <SelectionToolbar
                        groups={[
                            {
                                countKey: "locationsSelected",
                                count: selectedLocationCount,
                                inlineActions: [],
                                overflowActions: [],
                            },
                            {
                                countKey: "hallsSelected",
                                count: selectedHallCount,
                                inlineActions: [],
                                overflowActions: [],
                            },
                        ]}
                        onClear={clearSelection}
                    />
                }
                rowSelection={parentSelection}
                onRowSelectionChange={setParentSelection}
            />
            <EditSheet
                open={!!editLocation}
                onOpenChange={(open) => !open && setEditLocation(null)}
                entity={editLocation}
                fields={locationFields}
                title={t("editLocation")}
                onSave={(data) => updateLocation.mutate(toLocationUpdateInput(data))}
            />
            <EditSheet
                open={!!editHall}
                onOpenChange={(open) => !open && setEditHall(null)}
                entity={editHall}
                fields={hallFields}
                title={t("editHall")}
                onSave={(data) => updateHall.mutate(toHallUpdateInput(data))}
            />
        </>
    );
}
