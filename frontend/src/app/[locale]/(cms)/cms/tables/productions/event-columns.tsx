"use client";

import { ColumnDef } from "@tanstack/react-table";
import { makeActionsColumn } from "../actions-column";
import type { FieldDef } from "../edit-sheet";
import type { Event } from "@/types/models/event.types";

export const eventFields: FieldDef<Event>[] = [
    { key: "id", label: "ID", type: "text", readOnly: true },
    { key: "startsAt", label: "Starts at", type: "text" },
    { key: "endsAt", label: "Ends at", type: "text" },
    { key: "doorsAt", label: "Doors at", type: "text" },
    { key: "intermissionAt", label: "Intermission at", type: "text" },
    { key: "status", label: "Status", type: "text" },
    { key: "hallId", label: "Hall ID", type: "text" },
    { key: "maxTicketsPerOrder", label: "Max tickets per order", type: "text" },
    { key: "vendorId", label: "Vendor ID", type: "text" },
    { key: "boxOfficeId", label: "Box office ID", type: "text" },
    { key: "uitdatabankId", label: "UiTdatabank ID", type: "text" },
];

export function makeEventColumns(
    options: {
        onEdit?: (entity: Event) => void;
    } = {}
): ColumnDef<Event>[] {
    return [
        {
            accessorKey: "startsAt",
            header: "Start",
            cell: ({ getValue }) => {
                const val = getValue<string>();
                if (!val) return "—";
                const d = new Date(val);
                return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
            },
        },
        {
            accessorKey: "endsAt",
            header: "End",
            cell: ({ getValue }) => {
                const val = getValue<string | null>();
                if (!val) return "—";
                const d = new Date(val);
                return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
            },
        },
        { accessorKey: "status", header: "Status" },
        { accessorKey: "hallId", header: "Hall" },
        makeActionsColumn<Event>({
            label: "event",
            copyKey: "id",
            onEdit: options.onEdit,
        }),
    ];
}
