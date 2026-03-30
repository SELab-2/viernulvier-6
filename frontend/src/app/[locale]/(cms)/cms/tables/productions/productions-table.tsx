"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Row } from "@tanstack/react-table";
import { DataTable, MemoSubTable } from "../data-table";
import { EditSheet } from "../edit-sheet";
import {
    makeProductionColumns,
    productionFields,
    toProductionUpdateInput,
    type ProductionRow,
} from "./columns";
import { SelectionToolbar } from "../selection-toolbar";
import { useParentChildSelection } from "../use-parent-child-selection";
import { makeProductionColumns, productionFields, toProductionUpdateInput } from "./columns";
import { makeEventColumns, eventFields, toEventUpdateInput } from "./event-columns";
import { Spinner } from "@/components/ui/spinner";
import { useGetProductions, useUpdateProduction } from "@/hooks/api/useProductions";
import { useGetEvents, useUpdateEvent } from "@/hooks/api/useEvents";
import type { Production } from "@/types/models/production.types";
import type { Event } from "@/types/models/event.types";

export function ProductionsTable() {
    const t = useTranslations("Cms.Productions");
    const { data: productions = [], isLoading: productionsLoading } = useGetProductions();
    const { data: allEvents = [], isLoading: eventsLoading } = useGetEvents();
    const updateProduction = useUpdateProduction();
    const updateEvent = useUpdateEvent();

    const [editProduction, setEditProduction] = useState<ProductionRow | null>(null);
    const [editEvent, setEditEvent] = useState<Event | null>(null);

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

    const getEventRowId = useCallback((row: Event) => row.id, []);

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
                getRowCanExpand={(row) =>
                    (eventsByProduction.get(row.original.id)?.length ?? 0) > 0
                }
                expanderLabels={{ show: t("showEvents"), hide: t("hideEvents") }}
                toolbar={
                    <SelectionToolbar
                        groups={[
                            {
                                countKey: "productionsSelected",
                                count: selectedProductionCount,
                                inlineActions: [],
                                overflowActions: [],
                            },
                            {
                                countKey: "eventsSelected",
                                count: selectedEventCount,
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
