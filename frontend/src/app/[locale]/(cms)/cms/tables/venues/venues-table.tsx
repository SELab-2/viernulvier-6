"use client";

import { useCallback, useMemo, useState } from "react";
import type { Row } from "@tanstack/react-table";
import { DataTable } from "../data-table";
import { EditSheet } from "../edit-sheet";
import { makeVenueColumns, venueFields, type Venue } from "./columns";
import { makeHallColumns, hallFields, type Hall } from "./hall-columns";
import { useLocations } from "@/hooks/use-locations";
import { useHalls } from "@/hooks/use-halls";
import { useSpaces } from "@/hooks/use-spaces";
import { useUpdateLocation } from "@/hooks/use-update-location";
import { useUpdateHall } from "@/hooks/use-update-hall";

export function VenuesTable() {
    const { data: locations = [], isLoading: loadingLocations } = useLocations();
    const { data: halls = [], isLoading: loadingHalls } = useHalls();
    const { data: spaces = [], isLoading: loadingSpaces } = useSpaces();

    const updateLocation = useUpdateLocation();
    const updateHall = useUpdateHall();

    const [editVenue, setEditVenue] = useState<Venue | null>(null);
    const [editHall, setEditHall] = useState<Hall | null>(null);

    // Join: group halls under their parent location via the space relationship
    const venues: Venue[] = useMemo(() => {
        return locations.map((location) => {
            const locationSpaceIds = spaces
                .filter((s) => s.location_id === location.id)
                .map((s) => s.id);
            const nestedHalls = halls.filter(
                (h) => h.space_id !== null && locationSpaceIds.includes(h.space_id)
            );
            return { ...location, halls: nestedHalls };
        });
    }, [locations, halls, spaces]);

    const venueCols = useMemo(() => makeVenueColumns({ onEdit: setEditVenue }), []);
    const hallCols = useMemo(() => makeHallColumns({ onEdit: setEditHall }), []);

    const renderHalls = useCallback(
        (row: Row<Venue>) => {
            const nestedHalls: Hall[] = row.original.halls ?? [];
            return (
                <div className="bg-muted/30 py-1 pr-6 pl-12">
                    <DataTable columns={hallCols} data={nestedHalls} compact />
                </div>
            );
        },
        [hallCols]
    );

    const isLoading = loadingLocations || loadingHalls || loadingSpaces;

    if (isLoading) {
        return <div className="text-muted-foreground p-4 text-sm">Loading venues…</div>;
    }

    return (
        <>
            <DataTable
                columns={venueCols}
                data={venues}
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
                onSave={(updated) => updateLocation.mutate(updated)}
            />
            <EditSheet
                open={!!editHall}
                onOpenChange={(open) => !open && setEditHall(null)}
                entity={editHall}
                fields={hallFields}
                title="Edit hall"
                onSave={(updated) => updateHall.mutate(updated)}
            />
        </>
    );
}
