"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Row } from "@tanstack/react-table";
import { DataTable, MemoSubTable } from "../data-table";
import { EditSheet } from "../edit-sheet";
import { makeProductionColumns, productionFields, toProductionUpdateInput } from "./columns";
import type { ProductionRow } from "@/types/models/production.types";
import { SelectionToolbar } from "../selection-toolbar";
import { useParentChildSelection } from "../use-parent-child-selection";
import { makeEventColumns, eventFields, toEventUpdateInput } from "./event-columns";
import { CollectionPickerDialog } from "@/components/cms/collection-picker-dialog";
import { Spinner } from "@/components/ui/spinner";
import { useGetProductions, useUpdateProduction } from "@/hooks/api/useProductions";
import { useGetEvents, useUpdateEvent } from "@/hooks/api/useEvents";
import type { Production } from "@/types/models/production.types";
import type { Event } from "@/types/models/event.types";

export function ProductionsTable() {
    const t = useTranslations("Cms.Productions");
    const tCollections = useTranslations("Cms.Collections");
    const { data: productions = [], isLoading: productionsLoading } = useGetProductions();
    const { data: allEvents = [], isLoading: eventsLoading } = useGetEvents();
    const updateProduction = useUpdateProduction();
    const updateEvent = useUpdateEvent();

    const [editProduction, setEditProduction] = useState<ProductionRow | null>(null);
    const [editEvent, setEditEvent] = useState<Event | null>(null);
    const [productionDialogOpen, setProductionDialogOpen] = useState(false);
    const [eventDialogOpen, setEventDialogOpen] = useState(false);

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
        () => [selectColumn, ...makeProductionColumns({ onEdit: setEditProduction })],
        [selectColumn]
    );

    const eventCols = useMemo(() => makeEventColumns({ onEdit: setEditEvent }), []);

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

    return (
        <>
            <DataTable
                columns={productionCols}
                data={productions}
                loading={productionsLoading}
                renderSubComponent={renderEvents}
                getRowCanExpand={getRowCanExpand}
                expanderLabels={expanderLabels}
                toolbar={
                    <SelectionToolbar
                        groups={[
                            {
                                countKey: "productionsSelected",
                                count: selectedProductionCount,
                                inlineActions: [
                                    {
                                        label: tCollections("addToCollection"),
                                        onClick: () => setProductionDialogOpen(true),
                                    },
                                ],
                                overflowActions: [],
                            },
                            {
                                countKey: "eventsSelected",
                                count: selectedEventCount,
                                inlineActions: [
                                    {
                                        label: tCollections("addToCollection"),
                                        onClick: () => setEventDialogOpen(true),
                                    },
                                ],
                                overflowActions: [],
                            },
                        ]}
                        onClear={clearSelection}
                    />
                }
                rowSelection={parentSelection}
                onRowSelectionChange={setParentSelection}
                getRowId={getProductionRowId}
            />
            <CollectionPickerDialog
                open={productionDialogOpen}
                onOpenChange={setProductionDialogOpen}
                items={selectedProductions.map((production) => ({
                    contentId: production.id,
                    contentType: "production" as const,
                    label:
                        production.translations.find(
                            (translation) => translation.languageCode === "nl"
                        )?.title ||
                        production.translations.find(
                            (translation) => translation.languageCode === "en"
                        )?.title ||
                        production.slug,
                }))}
            />
            <CollectionPickerDialog
                open={eventDialogOpen}
                onOpenChange={setEventDialogOpen}
                items={selectedEvents.map((event) => ({
                    contentId: event.id,
                    contentType: "event" as const,
                    label: `${new Date(event.startsAt).toLocaleDateString()} ${new Date(event.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
                    parentProductionId: event.productionId,
                }))}
            />
            <EditSheet
                open={!!editProduction}
                onOpenChange={(open) => !open && setEditProduction(null)}
                entity={editProduction}
                fields={productionFields}
                title={t("editProduction")}
                onSave={(data) => updateProduction.mutate(toProductionUpdateInput(data))}
            />
            <EditSheet
                open={!!editEvent}
                onOpenChange={(open) => !open && setEditEvent(null)}
                entity={editEvent}
                fields={eventFields}
                title={t("editEvent")}
                onSave={(data) => updateEvent.mutate(toEventUpdateInput(data))}
            />
        </>
    );
}
