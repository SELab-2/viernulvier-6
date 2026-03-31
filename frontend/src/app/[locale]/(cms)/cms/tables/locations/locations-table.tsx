"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Row } from "@tanstack/react-table";
import { DataTable, MemoSubTable } from "../data-table";
import { EditSheet } from "../edit-sheet";
import { SelectionToolbar } from "../selection-toolbar";
import { useParentChildSelection } from "../use-parent-child-selection";
import { makeLocationColumns, locationFields, toLocationUpdateInput } from "./columns";
import { makeHallColumns, hallFields, toHallUpdateInput } from "./hall-columns";
import { Spinner } from "@/components/ui/spinner";
import { useGetLocations, useUpdateLocation } from "@/hooks/api/useLocations";
import { useGetHalls, useUpdateHall } from "@/hooks/api/useHalls";
import { useGetSpaces } from "@/hooks/api/useSpaces";
import type { Location, LocationRow } from "@/types/models/location.types";
import type { Hall } from "@/types/models/hall.types";

export function LocationsTable() {
    const t = useTranslations("Cms.Locations");
    const { data: locations = [], isLoading: locationsLoading } = useGetLocations();
    const { data: allHalls = [], isLoading: hallsLoading } = useGetHalls();
    const { data: allSpaces = [] } = useGetSpaces();
    const updateLocation = useUpdateLocation();
    const updateHall = useUpdateHall();

    const [editLocation, setEditLocation] = useState<LocationRow | null>(null);
    const [editHall, setEditHall] = useState<Hall | null>(null);

    const hallsByLocation = useMemo(() => {
        const spaceToLocation = new Map<string, string>();
        for (const space of allSpaces) {
            spaceToLocation.set(space.id, space.locationId);
        }

        const map = new Map<string, Hall[]>();
        for (const hall of allHalls) {
            if (!hall.spaceId) continue;
            const locationId = spaceToLocation.get(hall.spaceId);
            if (!locationId) continue;
            const list = map.get(locationId) ?? [];
            list.push(hall);
            map.set(locationId, list);
        }
        return map;
    }, [allHalls, allSpaces]);

    const {
        parentSelection,
        setParentSelection,
        childSelection,
        getChildHandler,
        selectColumn,
        selectedParentCount: selectedLocationCount,
        selectedChildCount: selectedHallCount,
        clearSelection,
    } = useParentChildSelection<Location>(hallsByLocation);

    const locationCols = useMemo(
        () => [selectColumn, ...makeLocationColumns({ onEdit: (row) => setEditLocation(row) })],
        [selectColumn]
    );

    const hallCols = useMemo(() => makeHallColumns({ onEdit: setEditHall }), []);

    const getLocationRowId = useCallback((row: Location) => row.id, []);
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
            const halls = hallsByLocation.get(locationId) ?? [];
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
        [childSelection, getChildHandler, getHallRowId, hallCols, hallsByLocation, hallsLoading]
    );

    return (
        <>
            <DataTable
                columns={locationCols}
                data={locations}
                loading={locationsLoading}
                renderSubComponent={renderHalls}
                getRowCanExpand={(row) => (hallsByLocation.get(row.original.id)?.length ?? 0) > 0}
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
                getRowId={getLocationRowId}
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
