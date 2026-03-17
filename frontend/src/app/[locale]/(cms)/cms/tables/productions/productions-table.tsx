"use client";

import { useCallback, useMemo, useState } from "react";
import type { Row } from "@tanstack/react-table";
import { DataTable } from "../data-table";
import { EditSheet } from "../edit-sheet";
import { makeProductionColumns, productionFields, type Production } from "./columns";
import { makeEventColumns, eventFields, type ProductionEvent } from "./event-columns";

const MOCK_PRODUCTIONS: Production[] = [
    {
        title: "Cut op de set!",
        metadata_status: "complete",
        tagline:
            "Een intieme theatershow als afsluiter van de rollercoaster die Droomvoeding was, voordat Brihang zich terugtrekt om nieuw materiaal aaneen te rijgen.",
        performer: "Brihang",
        events: [
            {
                date: "19/03/2026",
                time: "20:00",
                venue: "De Vooruit - Theaterzaal",
                ticket_status: "sold_out",
            },
        ],
    },
    {
        title: "Nirvana!",
        metadata_status: "complete",
        tagline: "nevermind first time in vooruit",
        performer: "Nirvana",
        events: [
            { date: "1991-11-25", time: "20:00", venue: "De Vooruit", ticket_status: "sold_out" },
            { date: "1991-11-26", time: "20:00", venue: "De Vooruit", ticket_status: "sold_out" },
        ],
    },
    {
        title: "De Vooruit",
        metadata_status: "complete",
        tagline: "nevermind first time in vooruit",
        performer: "Nirvana",
        events: [],
    },
];

interface ProductionsTableProps {
    data?: Production[];
}

export function ProductionsTable({ data = MOCK_PRODUCTIONS }: ProductionsTableProps) {
    const [editProduction, setEditProduction] = useState<Production | null>(null);
    const [editEvent, setEditEvent] = useState<ProductionEvent | null>(null);

    const productionCols = useMemo(() => makeProductionColumns({ onEdit: setEditProduction }), []);

    const eventCols = useMemo(() => makeEventColumns({ onEdit: setEditEvent }), []);

    const renderEvents = useCallback(
        (row: Row<Production>) => {
            const events: ProductionEvent[] = row.original.events ?? [];
            return (
                <div className="bg-muted/30 py-1 pr-6 pl-12">
                    <DataTable columns={eventCols} data={events} compact />
                </div>
            );
        },
        [eventCols]
    );

    return (
        <>
            <DataTable
                columns={productionCols}
                data={data}
                renderSubComponent={renderEvents}
                getRowCanExpand={(row) => (row.original.events?.length ?? 0) > 0}
                expanderLabels={{ show: "Show events", hide: "Hide events" }}
            />
            <EditSheet
                open={!!editProduction}
                onOpenChange={(open) => !open && setEditProduction(null)}
                entity={editProduction}
                fields={productionFields}
                title="Edit production"
            />
            <EditSheet
                open={!!editEvent}
                onOpenChange={(open) => !open && setEditEvent(null)}
                entity={editEvent}
                fields={eventFields}
                title="Edit event"
            />
        </>
    );
}
