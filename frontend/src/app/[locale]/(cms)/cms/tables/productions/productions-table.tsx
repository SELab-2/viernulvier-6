"use client";

import { useCallback, useMemo, useState } from "react";
import type { Row } from "@tanstack/react-table";
import { DataTable } from "../data-table";
import { EditSheet } from "../edit-sheet";
import { makeProductionColumns, productionFields, type Production } from "./columns";
import { makeEventColumns, eventFields, type ProductionEvent } from "./event-columns";
import { useProductions } from "@/hooks/use-productions";
import { useUpdateProduction } from "@/hooks/use-update-production";

export function ProductionsTable() {
    const { data = [], isLoading } = useProductions();
    const updateProduction = useUpdateProduction();

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

    if (isLoading) {
        return <div className="text-muted-foreground p-4 text-sm">Loading productions…</div>;
    }

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
                onSave={(updated) => updateProduction.mutate(updated)}
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
