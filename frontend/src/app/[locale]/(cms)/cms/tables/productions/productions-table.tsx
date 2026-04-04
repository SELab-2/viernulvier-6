"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Row } from "@tanstack/react-table";
import { DataTable, MemoSubTable } from "../data-table";
import { EditSheet } from "../edit-sheet";
import { ActionBar } from "../action-bar";
import { makeProductionColumns, productionFields, toProductionUpdateInput } from "./columns";
import type { ProductionRow } from "@/types/models/production.types";
import { useParentChildSelection } from "../use-parent-child-selection";
import { makeEventColumns, eventFields, toEventUpdateInput } from "./event-columns";
import { CollectionPickerDialog } from "@/components/cms/collection-picker-dialog";
import { Spinner } from "@/components/ui/spinner";
import { useGetProductions, useUpdateProduction } from "@/hooks/api/useProductions";
import { useGetEvents, useUpdateEvent } from "@/hooks/api/useEvents";
import { ActionVariant } from "@/types/cms/actions";
import type { Production } from "@/types/models/production.types";
import type { Event } from "@/types/models/event.types";

export function ProductionsTable() {
    const t = useTranslations("Cms.Productions");
    const tCollections = useTranslations("Cms.Collections");
    const tActions = useTranslations("Cms.ActionsColumn");
    const tBar = useTranslations("Cms.ActionBar");
    const { data: productionsResult, isLoading: productionsLoading } = useGetProductions();
    const { data: eventsResult, isLoading: eventsLoading } = useGetEvents();
    const productions = useMemo(() => productionsResult?.data ?? [], [productionsResult?.data]);
    const allEvents = useMemo(() => eventsResult?.data ?? [], [eventsResult?.data]);
    const updateProduction = useUpdateProduction();
    const updateEvent = useUpdateEvent();

    const [editProduction, setEditProduction] = useState<ProductionRow | null>(null);
    const [editEvent, setEditEvent] = useState<Event | null>(null);
    const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);

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
        () => [selectColumn, ...makeProductionColumns({ onEdit: setEditProduction, t: tActions })],
        [selectColumn, tActions]
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
        () => productions.filter((production) => parentSelection[production.id]),
        [parentSelection, productions]
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

    const collectionPickerItems = useMemo(
        () => [
            ...selectedProductions.map((production) => ({
                contentId: production.id,
                contentType: "production" as const,
                label:
                    production.translations.find((translation) => translation.languageCode === "nl")
                        ?.title ||
                    production.translations.find((translation) => translation.languageCode === "en")
                        ?.title ||
                    production.slug,
            })),
            ...selectedEvents.map((event) => ({
                contentId: event.id,
                contentType: "event" as const,
                label: `${new Date(event.startsAt).toLocaleDateString()} ${new Date(event.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
                parentProductionId: event.productionId,
            })),
        ],
        [selectedProductions, selectedEvents]
    );

    const renderEvents = useCallback(
        (row: Row<Production>) => {
            if (eventsLoading) {
                return (
                    <div className="bg-muted/30 flex items-center py-1 pr-6 pl-12">
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
                totalCount={productions.length}
                totalCountKey="totalProductions"
                entityCounts={[
                    { countKey: "productionsSelected", count: selectedProductionCount },
                    { countKey: "eventsSelected", count: selectedEventCount },
                ]}
                actions={actions}
                onClear={clearSelection}
            />
            <div className="min-h-0 flex-1 overflow-auto">
                <DataTable
                    columns={productionCols}
                    data={productions}
                    loading={productionsLoading}
                    renderSubComponent={renderEvents}
                    getRowCanExpand={getRowCanExpand}
                    expanderLabels={expanderLabels}
                    rowSelection={parentSelection}
                    onRowSelectionChange={setParentSelection}
                    getRowId={getProductionRowId}
                />
            </div>
            <CollectionPickerDialog
                open={collectionDialogOpen}
                onOpenChange={setCollectionDialogOpen}
                items={collectionPickerItems}
            />
            <EditSheet
                open={!!editProduction}
                onOpenChange={(open) => !open && setEditProduction(null)}
                entity={editProduction}
                fields={productionFields}
                title={t("editProduction")}
                onSave={(data) => updateProduction.mutateAsync(toProductionUpdateInput(data))}
            />
            <EditSheet
                open={!!editEvent}
                onOpenChange={(open) => !open && setEditEvent(null)}
                entity={editEvent}
                fields={eventFields}
                title={t("editEvent")}
                onSave={(data) => updateEvent.mutateAsync(toEventUpdateInput(data))}
            />
        </>
    );
}
