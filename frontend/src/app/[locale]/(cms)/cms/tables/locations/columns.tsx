"use client";

import { ColumnDef } from "@tanstack/react-table";
import { makeActionsColumn } from "../actions-column";
import { BooleanCell } from "../boolean-cell";
import type { FieldDef } from "../edit-sheet";
import type { Location, LocationUpdateInput } from "@/types/models/location.types";

export const locationFields: FieldDef<Location>[] = [
    { key: "id", label: "ID", type: "text", readOnly: true },
    { key: "name", label: "Name", type: "text" },
    { key: "code", label: "Code", type: "text" },
    { key: "street", label: "Street", type: "text" },
    { key: "number", label: "Number", type: "text" },
    { key: "postalCode", label: "Postal code", type: "text" },
    { key: "city", label: "City", type: "text" },
    { key: "country", label: "Country", type: "text" },
    { key: "phone1", label: "Phone 1", type: "text" },
    { key: "phone2", label: "Phone 2", type: "text" },
    {
        key: "isOwnedByViernulvier",
        label: "Owned by Viernulvier",
        type: "boolean",
    },
    { key: "uitdatabankId", label: "UiTdatabank ID", type: "text" },
];

export function toLocationUpdateInput(entity: Location): LocationUpdateInput {
    return {
        id: entity.id,
        sourceId: entity.sourceId,
        name: entity.name,
        code: entity.code,
        street: entity.street,
        number: entity.number,
        postalCode: entity.postalCode,
        city: entity.city,
        country: entity.country,
        phone1: entity.phone1,
        phone2: entity.phone2,
        isOwnedByViernulvier: entity.isOwnedByViernulvier,
        uitdatabankId: entity.uitdatabankId,
    };
}

export function makeLocationColumns(options: {
    onEdit: (entity: Location) => void;
}): ColumnDef<Location>[] {
    return [
        {
            accessorKey: "name",
            header: "Naam",
            cell: ({ getValue }) => (
                <span className="font-display max-w-[200px] truncate text-base font-medium tracking-tight">
                    {String(getValue() || "—")}
                </span>
            ),
        },
        {
            accessorKey: "code",
            header: "Code",
            cell: ({ getValue }) => (
                <code className="bg-foreground/5 text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[10px]">
                    {String(getValue() || "—")}
                </code>
            ),
        },
        {
            accessorKey: "address",
            header: "Adres",
            cell: ({ getValue }) => (
                <span className="text-muted-foreground max-w-[200px] truncate text-sm">
                    {String(getValue() || "—")}
                </span>
            ),
        },
        {
            accessorKey: "phone1",
            header: "Telefoon",
            cell: ({ getValue }) => (
                <span className="font-mono text-[11px]">{String(getValue() || "—")}</span>
            ),
        },
        {
            accessorKey: "isOwnedByViernulvier",
            header: "Eigendom",
            cell: ({ getValue }) => <BooleanCell value={getValue<boolean | null>()} />,
        },
        makeActionsColumn<Location>({
            label: "location",
            copyKey: "name",
            onEdit: options.onEdit,
        }),
    ];
}
