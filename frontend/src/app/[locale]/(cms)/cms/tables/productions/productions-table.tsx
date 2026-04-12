"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Archive } from "lucide-react";
import type { Row } from "@tanstack/react-table";
import { DataTable, MemoSubTable } from "../data-table";
import { EditSheet } from "../edit-sheet";
import { makeProductionColumns, productionFields, toProductionUpdateInput } from "./columns";
import type { ProductionRow } from "@/types/models/production.types";
import { ActionBar } from "../action-bar";
import { useParentChildSelection } from "../use-parent-child-selection";
import { makeEventColumns, eventFields, toEventUpdateInput } from "./event-columns";
import { Spinner } from "@/components/ui/spinner";
import { useGetInfiniteProductions, useUpdateProduction } from "@/hooks/api/useProductions";
import { useGetEvents, useUpdateEvent } from "@/hooks/api/useEvents";
import { CollectionPickerDialog } from "@/components/cms/collection-picker-dialog";
import { ImageSpotlight, type SpotlightItem } from "@/components/ui/image-spotlight";
import type { PickerItem } from "@/lib/collection-picker-utils";
import type { Production } from "@/types/models/production.types";
import type { Event } from "@/types/models/event.types";

export function ProductionsTable() {
    const t = useTranslations("Cms.Productions");
    const tCollections = useTranslations("Cms.Collections");
    const tActions = useTranslations("Cms.ActionsColumn");
    const locale = useLocale();
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const {
        data: infiniteData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useGetInfiniteProductions();

    const { data: eventsResult, isLoading: eventsLoading } = useGetEvents();

    // Flatten all pages into a single array
    const allProductions = useMemo(
        () => infiniteData?.pages.flatMap((page) => page.data) ?? [],
        [infiniteData]
    );

    const allEvents = useMemo(() => eventsResult?.data ?? [], [eventsResult]);
    const updateProduction = useUpdateProduction();
    const updateEvent = useUpdateEvent();

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

    const [editProduction, setEditProduction] = useState<ProductionRow | null>(null);
    const [editEvent, setEditEvent] = useState<Event | null>(null);
    const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
    const [spotlight, setSpotlight] = useState<{ src: string; alt: string } | null>(null);
    const openSpotlight = useCallback((src: string, alt: string) => setSpotlight({ src, alt }), []);
    const spotlightItems: SpotlightItem[] = spotlight
        ? [{ kind: "plain", src: spotlight.src, alt: spotlight.alt }]
        : [];

    const eventsByProduction = useMemo(() => {
        const map = new Map<string, Event[]>();
        for (const event of allEvents) {
            const list = map.get(event.productionId) ?? [];
            list.push(event);
            map.set(event.productionId, list);
        }
        return map;
    }, [allEvents]);

    const {
        parentSelection,
        setParentSelection,
        childSelection,
        getChildHandler,
        selectColumn,
        selectedParentCount: selectedProductionCount,
        selectedChildCount: selectedEventCount,
        clearSelection,
    } = useParentChildSelection<Production>(eventsByProduction);

    const productionCols = useMemo(
        () => [
            selectColumn,
            ...makeProductionColumns({
                onEdit: setEditProduction,
                t: tActions,
                locale,
                onOpenSpotlight: openSpotlight,
            }),
        ],
        [selectColumn, tActions, locale, openSpotlight]
    );

    const eventCols = useMemo(
        () => makeEventColumns({ onEdit: setEditEvent, t: tActions }),
        [tActions]
    );

    const expanderLabels = useMemo(() => ({ show: t("showEvents"), hide: t("hideEvents") }), [t]);

    const getRowCanExpand = useCallback(
        (row: Row<Production>) => (eventsByProduction.get(row.original.id)?.length ?? 0) > 0,
        [eventsByProduction]
    );

    const getEventRowId = useCallback((row: Event) => row.id, []);
    const getProductionRowId = useCallback((row: Production) => row.id, []);

    const selectedProductions = useMemo(
        () => allProductions.filter((production) => parentSelection[production.id]),
        [parentSelection, allProductions]
    );

    const eventsById = useMemo(
        () => new Map(allEvents.map((event) => [event.id, event])),
        [allEvents]
    );
    const selectedEvents = useMemo(() => {
        const selected: Event[] = [];
        for (const selection of childSelection.values()) {
            for (const [eventId, isSelected] of Object.entries(selection)) {
                if (!isSelected) continue;
                const event = eventsById.get(eventId);
                if (event) selected.push(event);
            }
        }
        return selected;
    }, [childSelection, eventsById]);

    const collectionPickerItems: PickerItem[] = useMemo(
        () => [
            ...selectedProductions.map((p) => ({
                contentType: "production" as const,
                contentId: p.id,
                label: p.slug,
            })),
            ...selectedEvents.map((e) => ({
                contentType: "event" as const,
                contentId: e.id,
                label: e.id.slice(0, 8),
            })),
        ],
        [selectedProductions, selectedEvents]
    );

    const renderEvents = useCallback(
        (row: Row<Production>) => {
            if (eventsLoading) {
                return (
                    <div className="flex items-center py-1 pr-6 pl-14">
                        <Spinner className="text-muted-foreground size-3" />
                    </div>
                );
            }
            const productionId = row.original.id;
            const events = eventsByProduction.get(productionId) ?? [];
            return (
                <MemoSubTable
                    items={events}
                    columns={eventCols}
                    rowSelection={childSelection.get(productionId)}
                    onRowSelectionChange={getChildHandler(productionId)}
                    getRowId={getEventRowId}
                />
            );
        },
        [
            childSelection,
            eventCols,
            eventsByProduction,
            eventsLoading,
            getChildHandler,
            getEventRowId,
        ]
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
                        { countKey: "productionsSelected", count: selectedProductionCount },
                        { countKey: "eventsSelected", count: selectedEventCount },
                    ]}
                    actions={actions}
                    onClear={clearSelection}
                />
            </div>

            <div className="flex-1 overflow-auto">
                <DataTable
                    columns={productionCols}
                    data={allProductions}
                    getRowCanExpand={getRowCanExpand}
                    renderSubRows={renderEvents}
                    rowSelection={parentSelection}
                    onRowSelectionChange={setParentSelection}
                    expanderLabels={expanderLabels}
                    getRowId={getProductionRowId}
                />

                {/* Infinite scroll trigger */}
                {hasNextPage && (
                    <div ref={loadMoreRef} className="flex justify-center py-4">
                        <Spinner className="text-muted-foreground h-5 w-5" />
                    </div>
                )}
            </div>

            {editProduction && (
                <EditSheet
                    open={!!editProduction}
                    onOpenChange={(open) => !open && setEditProduction(null)}
                    title={t("editProduction")}
                    entity={editProduction}
                    fields={productionFields}
                    onSave={async (values) => {
                        await updateProduction.mutateAsync(toProductionUpdateInput(values));
                        setEditProduction(null);
                    }}
                />
            )}

            {editEvent && (
                <EditSheet
                    open={!!editEvent}
                    onOpenChange={(open) => !open && setEditEvent(null)}
                    title={t("editEvent")}
                    entity={editEvent}
                    fields={eventFields}
                    onSave={async (values) => {
                        await updateEvent.mutateAsync(toEventUpdateInput(values));
                        setEditEvent(null);
                    }}
                />
            )}

            <CollectionPickerDialog
                open={collectionDialogOpen}
                onOpenChange={setCollectionDialogOpen}
                items={collectionPickerItems}
            />

            <ImageSpotlight
                items={spotlightItems}
                index={0}
                open={spotlight !== null}
                onOpenChange={(open) => {
                    if (!open) setSpotlight(null);
                }}
                eyebrow="Production"
            />
        </div>
    );
}
