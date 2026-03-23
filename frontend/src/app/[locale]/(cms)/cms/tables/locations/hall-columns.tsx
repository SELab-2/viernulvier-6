"use client";

import { ColumnDef } from "@tanstack/react-table";
import { makeActionsColumn } from "../actions-column";
import type { FieldDef } from "../edit-sheet";
import type { Hall } from "@/types/models/hall.types";

export const hallFields: FieldDef<Hall>[] = [
    { key: "id", label: "ID", type: "text", readOnly: true },
    { key: "name", label: "Name", type: "text" },
    { key: "slug", label: "Slug", type: "text", readOnly: true },
    { key: "vendorId", label: "Vendor ID", type: "text" },
    { key: "boxOfficeId", label: "Box office ID", type: "text" },
    { key: "seatSelection", label: "Seat selection", type: "boolean" },
    { key: "openSeating", label: "Open seating", type: "boolean" },
    { key: "remark", label: "Remark", type: "text" },
    { key: "spaceId", label: "Space ID", type: "text", readOnly: true },
];

export function makeHallColumns(
    options: {
        onEdit?: (entity: Hall) => void;
    } = {}
): ColumnDef<Hall>[] {
    return [
        { accessorKey: "name", header: "Name" },
        {
            accessorKey: "seatSelection",
            header: "Seat selection",
            cell: ({ getValue }) => {
                const v = getValue<boolean | null>();
                return v === null ? "—" : v ? "Yes" : "No";
            },
        },
        {
            accessorKey: "openSeating",
            header: "Open seating",
            cell: ({ getValue }) => {
                const v = getValue<boolean | null>();
                return v === null ? "—" : v ? "Yes" : "No";
            },
        },
        makeActionsColumn<Hall>({ label: "hall", copyKey: "name", onEdit: options.onEdit }),
    ];
}
