"use client";

import { ColumnDef } from "@tanstack/react-table";

export type Hall = {
    name: string;
    capacity: number;
    metadata_status: "partial" | "complete";
};

export const hallColumns: ColumnDef<Hall>[] = [
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "capacity",
        header: "Capacity",
    },
    {
        accessorKey: "metadata_status",
        header: "Data",
    },
];
