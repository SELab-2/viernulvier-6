"use client";

import { ColumnDef } from "@tanstack/react-table";
import { makeActionsColumn } from "../actions-column";

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

export const hallColumns: ColumnDef<Hall>[] = [
    {
        accessorKey: "name",
        header: "Name",
    },
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
    makeActionsColumn<Hall>({ label: "hall", copyKey: "name" }),
];
