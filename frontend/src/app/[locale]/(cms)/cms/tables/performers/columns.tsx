"use client";

import { ColumnDef } from "@tanstack/react-table";

export type Performer = {
    name: string;
    metadata_status: "partial" | "complete";
};

export const columns: ColumnDef<Performer>[] = [
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "metadata_status",
        header: "Data",
    },
];
