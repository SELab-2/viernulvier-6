"use client";

import { ColumnDef } from "@tanstack/react-table";
import { makeActionsColumn } from "../actions-column";
import type { Hall } from "./hall-columns";

export type Venue = {
    id: string;
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
    /** Halls are related via spaces; included when fetched with sub-resources */
    halls?: Hall[];
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
        accessorKey: "country",
        header: "Country",
    },
    {
        accessorKey: "is_owned_by_viernulvier",
        header: "Owned",
        cell: ({ getValue }) => {
            const v = getValue<boolean | null>();
            return v === null ? "—" : v ? "Yes" : "No";
        },
    },
    makeActionsColumn<Venue>({ label: "venue", copyKey: "name" }),
];
