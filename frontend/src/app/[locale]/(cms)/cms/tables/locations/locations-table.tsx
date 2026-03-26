"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Row } from "@tanstack/react-table";
import { DataTable, MemoSubTable } from "../data-table";
import { EditSheet } from "../edit-sheet";
import { makeLocationColumns, locationFields, toLocationUpdateInput } from "./columns";
import { makeHallColumns, hallFields, toHallUpdateInput } from "./hall-columns";
import { Spinner } from "@/components/ui/spinner";
import { useGetLocations, useUpdateLocation } from "@/hooks/api/useLocations";
import { useGetHalls, useUpdateHall } from "@/hooks/api/useHalls";
import type { Location } from "@/types/models/location.types";
import type { Hall } from "@/types/models/hall.types";

export function LocationsTable() {
    const t = useTranslations("Cms.Locations");
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
            if (hallsLoading) {
                return (
                    <div className="bg-muted/30 flex items-center py-1 pr-6 pl-12">
                        <Spinner className="text-muted-foreground size-3" />
                    </div>
                );
            }
            const halls = hallsBySpace.get(row.original.id) ?? [];
            return <MemoSubTable items={halls} columns={hallCols} />;
        },
        [hallCols, hallsBySpace, hallsLoading]
    );

    return (
        <>
            <DataTable
                columns={locationCols}
                data={locations}
                loading={locationsLoading}
                renderSubComponent={renderHalls}
                getRowCanExpand={(row) => (hallsBySpace.get(row.original.id)?.length ?? 0) > 0}
                expanderLabels={{ show: t("showHalls"), hide: t("hideHalls") }}
            />
            <EditSheet
                open={!!editLocation}
                onOpenChange={(open) => !open && setEditLocation(null)}
                entity={editLocation}
                fields={locationFields}
                title={t("editLocation")}
                onSave={(data) => updateLocation.mutate(toLocationUpdateInput(data))}
            />
            <EditSheet
                open={!!editHall}
                onOpenChange={(open) => !open && setEditHall(null)}
                entity={editHall}
                fields={hallFields}
                title={t("editHall")}
                onSave={(data) => updateHall.mutate(toHallUpdateInput(data))}
            />
        </>
    );
}
