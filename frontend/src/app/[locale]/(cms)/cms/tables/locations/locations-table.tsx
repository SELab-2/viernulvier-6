"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Row } from "@tanstack/react-table";
import { DataTable, MemoSubTable } from "../data-table";
import { EditSheet } from "../edit-sheet";
import { ActionBar } from "../action-bar";
import { useParentChildSelection } from "../use-parent-child-selection";
import { makeLocationColumns, locationFields, toLocationUpdateInput } from "./columns";
import { makeHallColumns, hallFields, toHallUpdateInput } from "./hall-columns";
import { CollectionPickerDialog } from "@/components/cms/collection-picker-dialog";
import { Spinner } from "@/components/ui/spinner";
import { useGetLocations, useUpdateLocation } from "@/hooks/api/useLocations";
import { useGetHalls, useUpdateHall } from "@/hooks/api/useHalls";
import { ActionVariant } from "@/types/cms/actions";
import type { Location } from "@/types/models/location.types";
import type { Hall } from "@/types/models/hall.types";

export function LocationsTable() {
    const t = useTranslations("Cms.Locations");
    const tCollections = useTranslations("Cms.Collections");
    const tActions = useTranslations("Cms.ActionsColumn");
    const tBar = useTranslations("Cms.ActionBar");
    const { data: locationsResult, isLoading: locationsLoading } = useGetLocations();
    const { data: hallsResult, isLoading: hallsLoading } = useGetHalls();
    const locations = useMemo(() => locationsResult?.data ?? [], [locationsResult?.data]);
    const allHalls = useMemo(() => hallsResult?.data ?? [], [hallsResult?.data]);
    const updateLocation = useUpdateLocation();
    const updateHall = useUpdateHall();

    const [editLocation, setEditLocation] = useState<Location | null>(null);
    const [editHall, setEditHall] = useState<Hall | null>(null);
    const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);

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

    const {
        parentSelection,
        setParentSelection,
        childSelection,
        getChildHandler,
        selectColumn,
        selectedParentCount: selectedLocationCount,
        selectedChildCount: selectedHallCount,
        clearSelection,
    } = useParentChildSelection<Location>(hallsBySpace);

    const locationCols = useMemo(
        () => [selectColumn, ...makeLocationColumns({ onEdit: setEditLocation, t: tActions })],
        [selectColumn, tActions]
    );

    const hallCols = useMemo(
        () => makeHallColumns({ onEdit: setEditHall, t: tActions }),
        [tActions]
    );

    const expanderLabels = useMemo(() => ({ show: t("showHalls"), hide: t("hideHalls") }), [t]);

    const getRowCanExpand = useCallback(
        (row: Row<Location>) => (hallsBySpace.get(row.original.id)?.length ?? 0) > 0,
        [hallsBySpace]
    );

    const getLocationRowId = useCallback((row: Location) => row.id, []);
    const getHallRowId = useCallback((row: Hall) => row.id, []);

    const selectedLocations = useMemo(
        () => locations.filter((location) => parentSelection[location.id]),
        [locations, parentSelection]
    );

    const collectionPickerItems = useMemo(
        () =>
            selectedLocations.map((location) => ({
                contentId: location.id,
                contentType: "location" as const,
                label: location.name || location.address || location.id,
            })),
        [selectedLocations]
    );

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

    const actions = useMemo(
        () => [
            {
                key: "add-to-collection",
                label: tCollections("addToCollection"),
                onClick: () => setCollectionDialogOpen(true),
            },
            {
                key: "bulk-edit",
                label: tBar("bulkEdit"),
                disabled: true,
            },
            {
                key: "delete",
                label: tBar("delete"),
                variant: ActionVariant.Destructive,
            },
        ],
        [tCollections, tBar]
    );

    return (
        <>
            <ActionBar
                totalCount={locations.length}
                totalCountKey="totalLocations"
                entityCounts={[
                    { countKey: "locationsSelected", count: selectedLocationCount },
                    { countKey: "hallsSelected", count: selectedHallCount },
                ]}
                actions={actions}
                onClear={clearSelection}
            />
            <div className="min-h-0 flex-1 overflow-auto">
                <DataTable
                    columns={locationCols}
                    data={locations}
                    loading={locationsLoading}
                    renderSubComponent={renderHalls}
                    getRowCanExpand={getRowCanExpand}
                    expanderLabels={expanderLabels}
                    rowSelection={parentSelection}
                    onRowSelectionChange={setParentSelection}
                    getRowId={getLocationRowId}
                />
            </div>
            <CollectionPickerDialog
                open={collectionDialogOpen}
                onOpenChange={setCollectionDialogOpen}
                items={collectionPickerItems}
            />
            <EditSheet
                open={!!editLocation}
                onOpenChange={(open) => !open && setEditLocation(null)}
                entity={editLocation}
                fields={locationFields}
                title={t("editLocation")}
                onSave={(data) => updateLocation.mutateAsync(toLocationUpdateInput(data))}
            />
            <EditSheet
                open={!!editHall}
                onOpenChange={(open) => !open && setEditHall(null)}
                entity={editHall}
                fields={hallFields}
                title={t("editHall")}
                onSave={(data) => updateHall.mutateAsync(toHallUpdateInput(data))}
            />
        </>
    );
}
