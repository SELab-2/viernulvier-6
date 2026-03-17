"use client";

import { ColumnDef } from "@tanstack/react-table";
import { makeActionsColumn } from "../actions-column";
import type { FieldDef } from "../edit-sheet";

export type Hall = {
    id: string;
    name: string;
    slug: string;
    vendor_id: string | null;
    box_office_id: string | null;
    seat_selection: boolean | null;
    open_seating: boolean | null;
    remark: string | null;
    space_id: string | null;
};

export const hallFields: FieldDef<Hall>[] = [
    { key: "id", label: "ID", type: "text", readOnly: true },
    { key: "name", label: "Name", type: "text" },
    { key: "slug", label: "Slug", type: "text", readOnly: true },
    { key: "vendor_id", label: "Vendor ID", type: "text" },
    { key: "box_office_id", label: "Box office ID", type: "text" },
    { key: "seat_selection", label: "Seat selection", type: "boolean" },
    { key: "open_seating", label: "Open seating", type: "boolean" },
    { key: "remark", label: "Remark", type: "text" },
    { key: "space_id", label: "Space ID", type: "text", readOnly: true },
];

export function makeHallColumns(
    options: {
        onEdit?: (entity: Hall) => void;
    } = {}
): ColumnDef<Hall>[] {
    return [
        { accessorKey: "name", header: "Name" },
        {
            accessorKey: "seat_selection",
            header: "Seat selection",
            cell: ({ getValue }) => {
                const v = getValue<boolean | null>();
                return v === null ? "—" : v ? "Yes" : "No";
            },
        },
        {
            accessorKey: "open_seating",
            header: "Open seating",
            cell: ({ getValue }) => {
                const v = getValue<boolean | null>();
                return v === null ? "—" : v ? "Yes" : "No";
            },
        },
        makeActionsColumn<Hall>({ label: "hall", copyKey: "name", onEdit: options.onEdit }),
    ];
}
