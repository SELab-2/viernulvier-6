"use client";

import { useCallback, useMemo, useState } from "react";
import type { Row } from "@tanstack/react-table";
import { DataTable } from "../data-table";
import { EditSheet } from "../edit-sheet";
import { makeLocationColumns, locationFields } from "./columns";
import { makeHallColumns, hallFields } from "./hall-columns";
import { useGetLocations, useUpdateLocation } from "@/hooks/api/useLocations";
import { useGetHalls, useUpdateHall } from "@/hooks/api/useHalls";
import type { Location } from "@/types/models/location.types";
import type { Hall } from "@/types/models/hall.types";

export function LocationsTable() {
    const { data: locations = [], isLoading: locationsLoading } = useGetLocations();
    const { data: allHalls = [], isLoading: hallsLoading } = useGetHalls();
    const updateLocation = useUpdateLocation();
    const updateHall = useUpdateHall();

    const [editLocation, setEditLocation] = useState<Location | null>(null);
    const [editHall, setEditHall] = useState<Hall | null>(null);

    const hallsBySpace = useMemo(() => {
        const map = new Map<string, Hall[]>();
        for (const hall of allHalls) {
            if (!hall.spaceId) continue;
            const list = map.get(hall.spaceId) ?? [];
            list.push(hall);
            map.set(hall.spaceId, list);
        }
        return map;
    }, [allHalls]);

    const locationCols = useMemo(() => makeLocationColumns({ onEdit: setEditLocation }), []);

    const hallCols = useMemo(() => makeHallColumns({ onEdit: setEditHall }), []);

    const renderHalls = useCallback(
        (row: Row<Location>) => {
            const halls = hallsBySpace.get(row.original.id) ?? [];
            return (
                <div className="bg-muted/30 py-1 pr-6 pl-12">
                    <DataTable columns={hallCols} data={halls} compact />
                </div>
            );
        },
        [hallCols, hallsBySpace]
    );

    const isLoading = locationsLoading || hallsLoading;

    if (isLoading) {
        return <p className="text-muted-foreground text-sm">Loading locations...</p>;
    }

    return (
        <>
            <DataTable
                columns={locationCols}
                data={locations}
                renderSubComponent={renderHalls}
                getRowCanExpand={(row) => (hallsBySpace.get(row.original.id)?.length ?? 0) > 0}
                expanderLabels={{ show: "Show halls", hide: "Hide halls" }}
            />
            <EditSheet
                open={!!editLocation}
                onOpenChange={(open) => !open && setEditLocation(null)}
                entity={editLocation}
                fields={locationFields}
                title="Edit location"
                onSave={(data) => updateLocation.mutate(data)}
            />
            <EditSheet
                open={!!editHall}
                onOpenChange={(open) => !open && setEditHall(null)}
                entity={editHall}
                fields={hallFields}
                title="Edit hall"
                onSave={(data) => updateHall.mutate(data)}
            />
        </>
    );
}
