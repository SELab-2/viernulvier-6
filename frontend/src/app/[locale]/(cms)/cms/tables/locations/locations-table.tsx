"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Archive } from "lucide-react";
import type { Row } from "@tanstack/react-table";
import { DataTable, MemoSubTable } from "../data-table";
import { EditSheet } from "../edit-sheet";
import { ActionBar } from "../action-bar";
import { useParentChildSelection } from "../use-parent-child-selection";
import { makeLocationColumns, locationFields, toLocationUpdateInput } from "./columns";
import { makeHallColumns, hallFields, toHallUpdateInput } from "./hall-columns";
import { CollectionPickerDialog } from "@/components/cms/collection-picker-dialog";
import { Spinner } from "@/components/ui/spinner";
import { useGetInfiniteLocations, useUpdateLocation } from "@/hooks/api/useLocations";
import { useGetHalls, useUpdateHall } from "@/hooks/api/useHalls";
import type { Location } from "@/types/models/location.types";
import type { Hall } from "@/types/models/hall.types";

export function LocationsTable() {
    const t = useTranslations("Cms.Locations");
    const tCollections = useTranslations("Cms.Collections");
    const tActions = useTranslations("Cms.ActionsColumn");
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const {
        data: infiniteData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useGetInfiniteLocations();

    const { data: hallsResult, isLoading: hallsLoading } = useGetHalls();

    // Flatten all pages into a single array
    const locations = useMemo(
        () => infiniteData?.pages.flatMap((page) => page.data) ?? [],
        [infiniteData]
    );

    const allHalls = useMemo(() => hallsResult?.data ?? [], [hallsResult]);
    const updateLocation = useUpdateLocation();
    const updateHall = useUpdateHall();

    // Load more handler
    const loadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Intersection observer for infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) loadMore();
            },
            { threshold: 0.1, rootMargin: "100px" }
        );
        const currentRef = loadMoreRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => {
            if (currentRef) observer.unobserve(currentRef);
        };
    }, [loadMore]);

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
                icon: <Archive className="h-3.5 w-3.5" />,
                onClick: () => setCollectionDialogOpen(true),
            },
            {
                key: "delete",
                label: "Delete",
            },
        ],
        [tCollections]
    );

    return (
        <div className="flex h-full flex-col">
            <div className="bg-background sticky top-0 z-10">
                <ActionBar
                    entityCounts={[
                        { countKey: "locationsSelected", count: selectedLocationCount },
                        { countKey: "hallsSelected", count: selectedHallCount },
                    ]}
                    actions={actions}
                    onClear={clearSelection}
                />
            </div>
            <div className="flex-1 overflow-auto">
                <DataTable
                    columns={locationCols}
                    data={locations}
                    renderSubComponent={renderHalls}
                    getRowCanExpand={getRowCanExpand}
                    expanderLabels={expanderLabels}
                    rowSelection={parentSelection}
                    onRowSelectionChange={setParentSelection}
                    getRowId={getLocationRowId}
                />

                {/* Infinite scroll trigger */}
                {hasNextPage && (
                    <div ref={loadMoreRef} className="flex justify-center py-4">
                        <Spinner className="text-muted-foreground h-5 w-5" />
                    </div>
                )}
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
        </div>
    );
}
