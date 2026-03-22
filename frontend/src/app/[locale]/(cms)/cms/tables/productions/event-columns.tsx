"use client";

import { ColumnDef } from "@tanstack/react-table";
import { makeActionsColumn } from "../actions-column";
import type { FieldDef } from "../edit-sheet";

export type ProductionEvent = {
    id: string;
    date: string;
    time: string;
    venue: string;
    ticket_status: "available" | "sold_out" | "cancelled";
};

export const eventFields: FieldDef<ProductionEvent>[] = [
    { key: "date", label: "Date", type: "text" },
    { key: "time", label: "Time", type: "text" },
    { key: "venue", label: "Venue", type: "text" },
    {
        key: "ticket_status",
        label: "Ticket status",
        type: "select",
        options: [
            { value: "available", label: "Available" },
            { value: "sold_out", label: "Sold out" },
            { value: "cancelled", label: "Cancelled" },
        ],
    },
];

export function makeEventColumns(
    options: {
        onEdit?: (entity: ProductionEvent) => void;
    } = {}
): ColumnDef<ProductionEvent>[] {
    return [
        { accessorKey: "date", header: "Date" },
        { accessorKey: "time", header: "Time" },
        { accessorKey: "venue", header: "Venue" },
        { accessorKey: "ticket_status", header: "Tickets" },
        makeActionsColumn<ProductionEvent>({
            label: "event",
            copyKey: "venue",
            onEdit: options.onEdit,
        }),
    ];
}
