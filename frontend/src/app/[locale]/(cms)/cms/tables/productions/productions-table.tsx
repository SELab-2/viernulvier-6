"use client";

import { useCallback, useMemo, useState } from "react";
import type { Row } from "@tanstack/react-table";
import { DataTable } from "../data-table";
import { EditSheet } from "../edit-sheet";
import { makeProductionColumns, productionFields, toProductionUpdateInput } from "./columns";
import { makeEventColumns, eventFields, toEventUpdateInput } from "./event-columns";
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
            const events = eventsByProduction.get(row.original.id) ?? [];
            return (
                <div className="bg-muted/30 py-1 pr-6 pl-12">
                    <DataTable columns={eventCols} data={events} compact />
                </div>
            );
        },
        [eventCols, eventsByProduction]
    );

    const isLoading = productionsLoading || eventsLoading;

    if (isLoading) {
        return <p className="text-muted-foreground text-sm">Loading productions...</p>;
    }

    return (
        <>
            <DataTable
                columns={productionCols}
                data={productions}
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
