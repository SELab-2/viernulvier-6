"use client";

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Archive } from "lucide-react";
import type { Row } from "@tanstack/react-table";
import { DataTable, MemoSubTable } from "../data-table";
import { EditSheet } from "../edit-sheet";
import { makeProductionColumns } from "./columns";
import { makeEventFields, toEventUpdateInput } from "./event-columns";
import { ActionBar } from "../action-bar";
import { SearchInput } from "@/components/cms/search-input";
import { useParentChildSelection } from "../use-parent-child-selection";
import { makeEventColumns } from "./event-columns";
import { Spinner } from "@/components/ui/spinner";
import { useGetInfiniteProductions } from "@/hooks/api/useProductions";
import { useGetEvents, useUpdateEvent } from "@/hooks/api/useEvents";
import { CollectionPickerDialog } from "@/components/cms/collection-picker-dialog";
import { ProductionMediaSheet } from "@/components/cms/production-media-sheet";
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
    const searchParams = useSearchParams();
    const q = searchParams.get("q") ?? undefined;

    const {
        data: infiniteData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useGetInfiniteProductions(q ? { q } : undefined);

    const { data: eventsResult, isLoading: eventsLoading } = useGetEvents();

    // Flatten all pages into a single array
    const allProductions = useMemo(
        () => infiniteData?.pages.flatMap((page) => page.data) ?? [],
        [infiniteData]
    );

    const allEvents = useMemo(() => eventsResult?.data ?? [], [eventsResult]);
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

    const [editEvent, setEditEvent] = useState<Event | null>(null);
    const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
    const [mediaProduction, setMediaProduction] = useState<Production | null>(null);
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

    const handleEditProduction = useCallback(
        (production: Production) => {
            // Navigate to the dedicated editor page
            window.location.href = `/${locale}/cms/productions/${production.id}/edit`;
        },
        [locale]
    );

    const productionCols = useMemo(
        () => [
            selectColumn,
            ...makeProductionColumns({
                onEdit: handleEditProduction,
                onMedia: setMediaProduction,
                t: tActions,
                tProductions: t,
                locale,
                onOpenSpotlight: openSpotlight,
            }),
        ],
        [selectColumn, tActions, handleEditProduction, t, locale, openSpotlight]
    );

    const eventCols = useMemo(
        () => makeEventColumns({ onEdit: setEditEvent, t: tActions, tProductions: t }),
        [tActions, t]
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
                label: t("deleteAction"),
            },
        ],
        [tCollections, t]
    );

    return (
        <div className="flex h-full flex-col">
            <div className="bg-background sticky top-0 z-10">
                <div className="flex items-center justify-between py-1">
                    <SearchInput placeholder={t("search")} />
                </div>
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

            {editEvent && (
                <EditSheet
                    open={!!editEvent}
                    onOpenChange={(open) => !open && setEditEvent(null)}
                    title={t("editEvent")}
                    entity={editEvent}
                    fields={makeEventFields(t)}
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

            {mediaProduction && (
                <ProductionMediaSheet
                    productionId={mediaProduction.id}
                    productionTitle={
                        mediaProduction.translations.find((t) => t.languageCode === "nl")?.title ??
                        mediaProduction.slug
                    }
                    open={true}
                    onOpenChange={(open) => {
                        if (!open) setMediaProduction(null);
                    }}
                />
            )}

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
