"use client";

import { ColumnDef } from "@tanstack/react-table";
import { makeActionsColumn } from "../actions-column";
import type { FieldDef } from "../edit-sheet";
import type { Event, EventUpdateInput } from "@/types/models/event.types";

// Format datetime in a hydration-safe way using fixed format
function formatDateTime(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    // Use fixed format to avoid hydration mismatches between server/client locales
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function StatusBadge({ status }: { status: string }) {
    const statusStyles: Record<string, string> = {
        scheduled: "bg-foreground/5 text-foreground",
        cancelled: "bg-destructive/10 text-destructive",
        postponed: "bg-foreground/10 text-muted-foreground",
        soldout: "bg-foreground/10 text-foreground",
    };
    const style = statusStyles[status.toLowerCase()] || statusStyles.scheduled;

    return (
        <span
            className={`inline-block rounded px-2 py-0.5 font-mono text-[9px] tracking-[1px] uppercase ${style}`}
        >
            {status}
        </span>
    );
}

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

export function toEventUpdateInput(entity: Event): EventUpdateInput {
    return {
        id: entity.id,
        productionId: entity.productionId,
        startsAt: entity.startsAt,
        status: entity.status,
        sourceId: entity.sourceId,
        endsAt: entity.endsAt,
        intermissionAt: entity.intermissionAt,
        doorsAt: entity.doorsAt,
        vendorId: entity.vendorId,
        boxOfficeId: entity.boxOfficeId,
        uitdatabankId: entity.uitdatabankId,
        maxTicketsPerOrder: entity.maxTicketsPerOrder,
        hallId: entity.hallId,
    };
}

export function makeEventColumns(options: { onEdit: (entity: Event) => void }): ColumnDef<Event>[] {
    return [
        {
            accessorKey: "startsAt",
            header: "Datum & Tijd",
            cell: ({ getValue }) => (
                <span className="font-mono text-[11px] tracking-tight">
                    {formatDateTime(getValue<string>())}
                </span>
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
        },
        {
            accessorKey: "hallId",
            header: "Zaal",
            cell: ({ getValue }) => (
                <code className="bg-foreground/5 text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[10px]">
                    {String(getValue()).slice(0, 8)}...
                </code>
            ),
        },
        makeActionsColumn<Event>({
            label: "event",
            copyKey: "id",
            onEdit: options.onEdit,
        }),
    ];
}
