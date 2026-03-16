"use client";

import { ColumnDef } from "@tanstack/react-table";

export type Venue = {
    name: string;
    city: string;
    metadata_status: "partial" | "complete";
};

export const columns: ColumnDef<Venue>[] = [
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "city",
        header: "City",
    },
    {
        accessorKey: "metadata_status",
        header: "Data",
    },
];
