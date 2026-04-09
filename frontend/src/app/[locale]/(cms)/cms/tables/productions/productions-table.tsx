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
import { Spinner } from "@/components/ui/spinner";
import { useGetProductions, useUpdateProduction } from "@/hooks/api/useProductions";
import { useGetEvents, useUpdateEvent } from "@/hooks/api/useEvents";
import { CollectionPickerDialog } from "@/components/cms/collection-picker-dialog";
import type { PickerItem } from "@/lib/collection-picker-utils";
import type { Production } from "@/types/models/production.types";
import type { Event } from "@/types/models/event.types";
import { Archive } from "lucide-react";

export function ProductionsTable() {
    const t = useTranslations("Cms.Productions");
    const tCollections = useTranslations("Cms.Collections");
    const tActions = useTranslations("Cms.ActionsColumn");
    const { data: productionsResult } = useGetProductions();
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

    // Selection toolbar groups with our styling but main's collections feature
    const selectionGroups = useMemo(() => {
        const groups: Parameters<typeof SelectionToolbar>[0]["groups"] = [];
        if (selectedProductionCount > 0) {
            groups.push({
                countKey: "productionsSelected" as const,
                count: selectedProductionCount,
                inlineActions: [
                    {
                        label: tCollections("addToCollection"),
                        icon: <Archive className="h-3.5 w-3.5" />,
                        onClick: () => setCollectionDialogOpen(true),
                    },
                ],
                overflowActions: [],
            });
        }
        if (selectedEventCount > 0) {
            groups.push({
                countKey: "eventsSelected" as const,
                count: selectedEventCount,
                inlineActions: [
                    {
                        label: tCollections("addToCollection"),
                        icon: <Archive className="h-3.5 w-3.5" />,
                        onClick: () => setCollectionDialogOpen(true),
                    },
                ],
                overflowActions: [],
            });
        }
        return groups;
    }, [selectedProductionCount, selectedEventCount, tCollections]);

    return (
        <div className="flex h-full flex-col">
            {/* Our styled SelectionToolbar with collections feature - sticky */}
            <div className="bg-background sticky top-0 z-10">
                <SelectionToolbar groups={selectionGroups} onClear={clearSelection} />
            </div>

            <div className="flex-1 overflow-auto">
                <DataTable
                    columns={productionCols}
                    data={productions}
                    getRowCanExpand={getRowCanExpand}
                    renderSubRows={renderEvents}
                    rowSelection={parentSelection}
                    onRowSelectionChange={setParentSelection}
                    expanderLabels={expanderLabels}
                    getRowId={getProductionRowId}
                />
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
        </div>
    );
}
