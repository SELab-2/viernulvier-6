"use client";

import { ColumnDef } from "@tanstack/react-table";

export const columns: ColumnDef<Record<string, unknown>>[] = [
    { accessorKey: "title", header: "Title" },
];
