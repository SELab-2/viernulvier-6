"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Archive, ChevronsUp } from "lucide-react";
import { toast } from "sonner";
import type { ExpandedState, Row } from "@tanstack/react-table";
import { DataTable, MemoSubTable } from "../data-table";
import { EditSheet } from "../edit-sheet";
import { ActionBar } from "../action-bar";
import { useParentChildSelection } from "../use-parent-child-selection";
import {
    makeLocationColumns,
    locationFields,
    toLocationRow,
    toLocationUpdateInput,
} from "./columns";
import { makeHallColumns, hallFields, toHallUpdateInput } from "./hall-columns";
import { CollectionPickerDialog } from "@/components/cms/collection-picker-dialog";
import { LocationCoverField } from "@/components/cms/location-cover-field";
import { ImageSpotlight, type SpotlightItem } from "@/components/ui/image-spotlight";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
    useDeleteLocation,
    useGetInfiniteLocations,
    useUpdateLocation,
} from "@/hooks/api/useLocations";
import { useGetHalls, useUpdateHall } from "@/hooks/api/useHalls";
import { useGetSpaces } from "@/hooks/api/useSpaces";
import type { Location, LocationRow } from "@/types/models/location.types";
import type { Hall } from "@/types/models/hall.types";

export function LocationsTable() {
    const t = useTranslations("Cms.Locations");
    const tCommon = useTranslations("Cms.common");
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
    const { data: spacesResult } = useGetSpaces();

    const locations = useMemo(
        () => infiniteData?.pages.flatMap((page) => page.data) ?? [],
        [infiniteData]
    );

    const allHalls = useMemo(() => hallsResult?.data ?? [], [hallsResult]);
    const allSpaces = useMemo(() => spacesResult?.data ?? [], [spacesResult]);
    const updateLocation = useUpdateLocation();
    const updateHall = useUpdateHall();
    const deleteLocation = useDeleteLocation();

    const loadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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

    const [editLocationId, setEditLocationId] = useState<string | null>(null);
    const [editHall, setEditHall] = useState<Hall | null>(null);
    const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const [spotlight, setSpotlight] = useState<{ src: string; alt: string } | null>(null);
    const openSpotlight = useCallback((src: string, alt: string) => setSpotlight({ src, alt }), []);

    // Derive the current LocationRow from live query data so cover image url stays fresh
    // after linkMedia / clearCover mutations without closing and re-opening the sheet.
    const editLocation: LocationRow | null = useMemo(() => {
        if (!editLocationId) return null;
        const found = locations.find((l) => l.id === editLocationId);
        return found ? toLocationRow(found) : null;
    }, [editLocationId, locations]);

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

    const spotlightItems: SpotlightItem[] = spotlight
        ? [{ kind: "plain", src: spotlight.src, alt: spotlight.alt }]
        : [];

    const handleDeleteLocation = useCallback(
        (location: Location) => {
            const title = location.name || location.slug || location.id;
            const ok = window.confirm(t("deleteConfirm", { title }));
            if (!ok) return;
            deleteLocation.mutate(location.id, {
                onSuccess: () => toast.success(t("deleteSuccess")),
                onError: () => toast.error(t("deleteError")),
            });
        },
        [deleteLocation, t]
    );

    const locationCols = useMemo(
        () => [
            selectColumn,
            ...makeLocationColumns({
                onEdit: (row) => setEditLocationId(row.id),
                onDelete: handleDeleteLocation,
                t: tActions,
                onOpenSpotlight: openSpotlight,
            }),
        ],
        [selectColumn, tActions, handleDeleteLocation, openSpotlight]
    );

    const hallCols = useMemo(
        () => makeHallColumns({ onEdit: setEditHall, t: tActions }),
        [tActions]
    );

    const expanderLabels = useMemo(() => ({ show: t("showHalls"), hide: t("hideHalls") }), [t]);

    const getRowCanExpand = useCallback(
        (row: Row<Location>) => (hallsByLocation.get(row.original.id)?.length ?? 0) > 0,
        [hallsByLocation]
    );

    const getLocationRowId = useCallback((row: Location) => row.id, []);
    const getHallRowId = useCallback((row: Hall) => row.id, []);

    const selectedLocations = useMemo(
        () => locations.filter((location) => parentSelection[location.id]),
        [locations, parentSelection]
    );

    const handleBulkDelete = useCallback(() => {
        const ok = window.confirm(t("deleteConfirmMultiple", { count: selectedLocationCount }));
        if (!ok) return;
        let success = 0;
        let failed = 0;
        selectedLocations.forEach((location) => {
            deleteLocation.mutate(location.id, {
                onSuccess: () => {
                    success++;
                    if (success + failed === selectedLocations.length) {
                        toast.success(t("deleteSuccess"));
                        clearSelection();
                    }
                },
                onError: () => {
                    failed++;
                    if (success + failed === selectedLocations.length) {
                        if (failed > 0) toast.error(t("deleteError"));
                        clearSelection();
                    }
                },
            });
        });
    }, [selectedLocations, selectedLocationCount, deleteLocation, t, clearSelection]);

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

    const hasExpanded = Object.keys(expanded).length > 0;
    const collapseAll = useCallback(() => setExpanded({}), []);

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
                label: tCommon("delete"),
                onClick: handleBulkDelete,
            },
        ],
        [tCollections, tCommon, handleBulkDelete]
    );

    return (
        <div className="flex h-full flex-col">
            <div className="bg-background sticky top-0 z-10 flex items-center justify-between gap-2">
                <ActionBar
                    entityCounts={[
                        { countKey: "locationsSelected", count: selectedLocationCount },
                        { countKey: "hallsSelected", count: selectedHallCount },
                    ]}
                    actions={actions}
                    onClear={clearSelection}
                />
                {hasExpanded && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={collapseAll}
                        className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer rounded-none font-mono text-[10px] tracking-[1.5px] uppercase"
                    >
                        <ChevronsUp className="mr-1 h-3.5 w-3.5" />
                        {tCommon("collapseAll")}
                    </Button>
                )}
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
                    expanded={expanded}
                    onExpandedChange={setExpanded}
                    getRowId={getLocationRowId}
                />

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
                open={!!editLocationId}
                onOpenChange={(open) => !open && setEditLocationId(null)}
                entity={editLocation}
                fields={locationFields}
                title={t("editLocation")}
                onSave={(data) => updateLocation.mutateAsync(toLocationUpdateInput(data))}
                extraContent={(row) => <LocationCoverField location={row} />}
            />
            <EditSheet
                open={!!editHall}
                onOpenChange={(open) => !open && setEditHall(null)}
                entity={editHall}
                fields={hallFields}
                title={t("editHall")}
                onSave={(data) => updateHall.mutateAsync(toHallUpdateInput(data))}
            />
            <ImageSpotlight
                items={spotlightItems}
                index={0}
                open={spotlight !== null}
                onOpenChange={(open) => {
                    if (!open) setSpotlight(null);
                }}
                eyebrow={t("eyebrow")}
            />
        </div>
    );
}
