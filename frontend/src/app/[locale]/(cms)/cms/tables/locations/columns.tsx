"use client";

import { ColumnDef } from "@tanstack/react-table";
import { makeActionsColumn } from "../actions-column";
import type { FieldDef } from "../edit-sheet";
import type { Location } from "@/types/models/location.types";

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
    { key: "isOwnedByViernulvier", label: "Owned by Viernulvier", type: "boolean" },
    { key: "uitdatabankId", label: "UiTdatabank ID", type: "text" },
];

export function makeLocationColumns(
    options: {
        onEdit?: (entity: Location) => void;
    } = {}
): ColumnDef<Location>[] {
    return [
        { accessorKey: "name", header: "Name" },
        { accessorKey: "city", header: "City" },
        { accessorKey: "country", header: "Country" },
        {
            accessorKey: "isOwnedByViernulvier",
            header: "Owned",
            cell: ({ getValue }) => {
                const v = getValue<boolean | null>();
                return v === null ? "—" : v ? "Yes" : "No";
            },
        },
        makeActionsColumn<Location>({ label: "location", copyKey: "name", onEdit: options.onEdit }),
    ];
}
