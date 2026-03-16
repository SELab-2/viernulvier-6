"use client";

import { ColumnDef } from "@tanstack/react-table";
import { makeActionsColumn } from "../actions-column";

export type ProductionEvent = {
    date: string;
    time: string;
    venue: string;
    ticket_status: "available" | "sold_out" | "cancelled";
};

export const eventColumns: ColumnDef<ProductionEvent>[] = [
    {
        accessorKey: "date",
        header: "Date",
    },
    {
        accessorKey: "time",
        header: "Time",
    },
    {
        accessorKey: "venue",
        header: "Venue",
    },
    {
        accessorKey: "ticket_status",
        header: "Tickets",
    },
    makeActionsColumn<ProductionEvent>({ label: "event", copyKey: "venue" }),
];
