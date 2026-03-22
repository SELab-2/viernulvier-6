"use client";

import { ColumnDef } from "@tanstack/react-table";
import { makeActionsColumn } from "../actions-column";
import type { FieldDef } from "../edit-sheet";
import type { ProductionEvent } from "./event-columns";

export type Production = {
    id: string;
    title: string;
    tagline: string;
    performer: string;
    metadata_status: "partial" | "complete";
    events?: ProductionEvent[];
};

export const productionFields: FieldDef<Production>[] = [
    { key: "title", label: "Title", type: "text" },
    { key: "performer", label: "Performer", type: "text" },
    { key: "tagline", label: "Tagline", type: "text" },
    {
        key: "metadata_status",
        label: "Status",
        type: "select",
        options: [
            { value: "partial", label: "Partial" },
            { value: "complete", label: "Complete" },
        ],
    },
];

export function makeProductionColumns(
    options: {
        onEdit?: (entity: Production) => void;
    } = {}
): ColumnDef<Production>[] {
    return [
        { accessorKey: "title", header: "Title" },
        { accessorKey: "performer", header: "Performer" },
        { accessorKey: "tagline", header: "Tagline" },
        { accessorKey: "metadata_status", header: "Data" },
        makeActionsColumn<Production>({
            label: "production",
            copyKey: "title",
            onEdit: options.onEdit,
        }),
    ];
}
