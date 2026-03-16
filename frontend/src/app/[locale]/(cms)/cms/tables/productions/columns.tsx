"use client";

import { ColumnDef } from "@tanstack/react-table";
import { makeActionsColumn } from "../actions-column";
import type { ProductionEvent } from "./event-columns";

export type Production = {
    title: string;
    tagline: string;
    performer: string;
    metadata_status: "partial" | "complete";
    events?: ProductionEvent[];
};

export const columns: ColumnDef<Production>[] = [
    {
        accessorKey: "title",
        header: "Title",
    },
    {
        accessorKey: "performer",
        header: "Performer",
    },
    {
        accessorKey: "tagline",
        header: "Tagline",
    },
    {
        accessorKey: "metadata_status",
        header: "Data",
    },
    makeActionsColumn<Production>({ label: "production", copyKey: "title" }),
];
