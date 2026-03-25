"use client";

import { useCallback, useMemo, useState } from "react";
import type { Row } from "@tanstack/react-table";
import { DataTable, MemoSubTable } from "../data-table";
import { EditSheet } from "../edit-sheet";
import { makeProductionColumns, productionFields, toProductionUpdateInput } from "./columns";
import { makeEventColumns, eventFields, toEventUpdateInput } from "./event-columns";
import { Spinner } from "@/components/ui/spinner";
import { useGetProductions, useUpdateProduction } from "@/hooks/api/useProductions";
import { useGetEvents, useUpdateEvent } from "@/hooks/api/useEvents";
import type { Production } from "@/types/models/production.types";
import type { Event } from "@/types/models/event.types";

export function ProductionsTable() {
    const { data: productions = [], isLoading: productionsLoading } = useGetProductions();
    const { data: allEvents = [], isLoading: eventsLoading } = useGetEvents();
    const updateProduction = useUpdateProduction();
    const updateEvent = useUpdateEvent();

    const [editProduction, setEditProduction] = useState<Production | null>(null);
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

    const productionCols = useMemo(() => makeProductionColumns({ onEdit: setEditProduction }), []);

    const eventCols = useMemo(() => makeEventColumns({ onEdit: setEditEvent }), []);

    const renderEvents = useCallback(
        (row: Row<Production>) => {
            if (eventsLoading) {
                return (
                    <div className="bg-muted/30 flex items-center py-1 pr-6 pl-12">
                        <Spinner className="text-muted-foreground size-3" />
                    </div>
                );
            }
            const events = eventsByProduction.get(row.original.id) ?? [];
            return <MemoSubTable items={events} columns={eventCols} />;
        },
        [eventCols, eventsByProduction, eventsLoading]
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
                expanderLabels={{ show: "Show events", hide: "Hide events" }}
            />
            <EditSheet
                open={!!editProduction}
                onOpenChange={(open) => !open && setEditProduction(null)}
                entity={editProduction}
                fields={productionFields}
                title="Edit production"
                onSave={(data) => updateProduction.mutate(toProductionUpdateInput(data))}
            />
            <EditSheet
                open={!!editEvent}
                onOpenChange={(open) => !open && setEditEvent(null)}
                entity={editEvent}
                fields={eventFields}
                title="Edit event"
                onSave={(data) => updateEvent.mutate(toEventUpdateInput(data))}
            />
        </>
    );
}
