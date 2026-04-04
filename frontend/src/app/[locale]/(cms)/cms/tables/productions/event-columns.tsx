"use client";

import { ColumnDef } from "@tanstack/react-table";
import { makeActionsColumn } from "../actions-column";
import type { FieldDef } from "../edit-sheet";
import { CollectionPickerSubmenu } from "@/components/cms/collection-picker-submenu";
import type { Event, EventUpdateInput } from "@/types/models/event.types";

function formatDateTime(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
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
            header: "Start",
            cell: ({ getValue }) => formatDateTime(getValue<string>()),
        },
        {
            accessorKey: "endsAt",
            header: "End",
            cell: ({ getValue }) => formatDateTime(getValue<string | null>()),
        },
        { accessorKey: "status", header: "Status" },
        { accessorKey: "hallId", header: "Hall" },
        makeActionsColumn<Event>({
            label: "event",
            copyKey: "id",
            onEdit: options.onEdit,
            extraMenuItems: (event, closeMenu) => (
                <CollectionPickerSubmenu
                    item={{
                        contentId: event.id,
                        contentType: "event",
                        label: formatDateTime(event.startsAt),
                        parentProductionId: event.productionId,
                    }}
                    onComplete={closeMenu}
                />
            ),
        }),
    ];
}
