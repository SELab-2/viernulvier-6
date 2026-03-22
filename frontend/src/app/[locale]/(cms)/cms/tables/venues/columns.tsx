"use client";

import { ColumnDef } from "@tanstack/react-table";
import { makeActionsColumn } from "../actions-column";
import type { FieldDef } from "../edit-sheet";
import type { Hall } from "./hall-columns";

export type Venue = {
    id: string;
    source_id: number | null;
    name: string | null;
    code: string | null;
    street: string | null;
    number: string | null;
    postal_code: string | null;
    city: string | null;
    country: string | null;
    phone_1: string | null;
    phone_2: string | null;
    is_owned_by_viernulvier: boolean | null;
    uitdatabank_id: string | null;
    /** Halls are related via spaces; joined client-side */
    halls?: Hall[];
};

export const venueFields: FieldDef<Venue>[] = [
    { key: "id", label: "ID", type: "text", readOnly: true },
    { key: "name", label: "Name", type: "text" },
    { key: "code", label: "Code", type: "text" },
    { key: "street", label: "Street", type: "text" },
    { key: "number", label: "Number", type: "text" },
    { key: "postal_code", label: "Postal code", type: "text" },
    { key: "city", label: "City", type: "text" },
    { key: "country", label: "Country", type: "text" },
    { key: "phone_1", label: "Phone 1", type: "text" },
    { key: "phone_2", label: "Phone 2", type: "text" },
    { key: "is_owned_by_viernulvier", label: "Owned by Viernulvier", type: "boolean" },
    { key: "uitdatabank_id", label: "UiTdatabank ID", type: "text" },
];

export function makeVenueColumns(
    options: {
        onEdit?: (entity: Venue) => void;
    } = {}
): ColumnDef<Venue>[] {
    return [
        { accessorKey: "name", header: "Name" },
        { accessorKey: "city", header: "City" },
        { accessorKey: "country", header: "Country" },
        {
            accessorKey: "is_owned_by_viernulvier",
            header: "Owned",
            cell: ({ getValue }) => {
                const v = getValue<boolean | null>();
                return v === null ? "—" : v ? "Yes" : "No";
            },
        },
        makeActionsColumn<Venue>({ label: "venue", copyKey: "name", onEdit: options.onEdit }),
    ];
}
