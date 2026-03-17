"use client";

import { useCallback, useMemo, useState } from "react";
import type { Row } from "@tanstack/react-table";
import { DataTable } from "../data-table";
import { EditSheet } from "../edit-sheet";
import { makeVenueColumns, venueFields, type Venue } from "./columns";
import { makeHallColumns, hallFields, type Hall } from "./hall-columns";

const MOCK_VENUES: Venue[] = [
    {
        id: "00000000-0000-0000-0000-000000000001",
        name: "De Vooruit",
        code: "VOORUIT",
        street: "Sint-Pietersnieuwstraat",
        number: "23",
        postal_code: "9000",
        city: "Gent",
        country: "BE",
        phone_1: null,
        phone_2: null,
        is_owned_by_viernulvier: true,
        uitdatabank_id: null,
        halls: [
            {
                id: "00000000-0000-0000-0000-000000000010",
                name: "Balzaal",
                slug: "balzaal",
                vendor_id: null,
                box_office_id: null,
                seat_selection: false,
                open_seating: true,
                remark: null,
                space_id: null,
            },
            {
                id: "00000000-0000-0000-0000-000000000011",
                name: "Filmzaal",
                slug: "filmzaal",
                vendor_id: null,
                box_office_id: null,
                seat_selection: true,
                open_seating: false,
                remark: null,
                space_id: null,
            },
        ],
    },
    {
        id: "00000000-0000-0000-0000-000000000002",
        name: "Stadschouwburg",
        code: null,
        street: "Sint-Baafsplein",
        number: "17",
        postal_code: "9000",
        city: "Gent",
        country: "BE",
        phone_1: null,
        phone_2: null,
        is_owned_by_viernulvier: false,
        uitdatabank_id: null,
        halls: [],
    },
];

interface VenuesTableProps {
    data?: Venue[];
}

export function VenuesTable({ data = MOCK_VENUES }: VenuesTableProps) {
    const [editVenue, setEditVenue] = useState<Venue | null>(null);
    const [editHall, setEditHall] = useState<Hall | null>(null);

    const venueCols = useMemo(() => makeVenueColumns({ onEdit: setEditVenue }), []);

    const hallCols = useMemo(() => makeHallColumns({ onEdit: setEditHall }), []);

    const renderHalls = useCallback(
        (row: Row<Venue>) => {
            const halls: Hall[] = row.original.halls ?? [];
            return (
                <div className="bg-muted/30 py-1 pr-6 pl-12">
                    <DataTable columns={hallCols} data={halls} compact />
                </div>
            );
        },
        [hallCols]
    );

    return (
        <>
            <DataTable
                columns={venueCols}
                data={data}
                renderSubComponent={renderHalls}
                getRowCanExpand={(row) => (row.original.halls?.length ?? 0) > 0}
                expanderLabels={{ show: "Show halls", hide: "Hide halls" }}
            />
            <EditSheet
                open={!!editVenue}
                onOpenChange={(open) => !open && setEditVenue(null)}
                entity={editVenue}
                fields={venueFields}
                title="Edit venue"
            />
            <EditSheet
                open={!!editHall}
                onOpenChange={(open) => !open && setEditHall(null)}
                entity={editHall}
                fields={hallFields}
                title="Edit hall"
            />
        </>
    );
}
