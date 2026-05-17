import { useQueries } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { mapHall } from "@/mappers/hall.mapper";
import { mapSpace } from "@/mappers/space.mapper";
import { mapLocation } from "@/mappers/location.mapper";
import type { GetHallByIdResponse } from "@/types/api/hall.api.types";
import type { GetSpaceByIdResponse } from "@/types/api/space.api.types";
import type { GetLocationByIdResponse } from "@/types/api/location.api.types";
import type { Event } from "@/types/models/event.types";
import type { Location } from "@/types/models/location.types";

import { queryKeys } from "./query-keys";

export function useFallbackLocation(events: Event[], enabled: boolean): Location | null {
    const allHallIds = [...new Set(events.flatMap((e) => e.hallIds))];

    const hallQueries = useQueries({
        queries: allHallIds.map((id) => ({
            queryKey: queryKeys.halls.detail(id),
            queryFn: async () => {
                const { data } = await api.get<GetHallByIdResponse>(`/halls/${id}`);
                return mapHall(data);
            },
            enabled: enabled && allHallIds.length > 0,
        })),
    });

    const spaceIds = [
        ...new Set(
            hallQueries.map((q) => q.data?.spaceId).filter((id): id is string => Boolean(id))
        ),
    ];

    const spaceQueries = useQueries({
        queries: spaceIds.map((id) => ({
            queryKey: queryKeys.spaces.detail(id),
            queryFn: async () => {
                const { data } = await api.get<GetSpaceByIdResponse>(`/spaces/${id}`);
                return mapSpace(data);
            },
            enabled: enabled && spaceIds.length > 0,
        })),
    });

    const locationIds = [
        ...new Set(
            spaceQueries.map((q) => q.data?.locationId).filter((id): id is string => Boolean(id))
        ),
    ];

    const locationQueries = useQueries({
        queries: locationIds.map((id) => ({
            queryKey: queryKeys.locations.detail(id),
            queryFn: async () => {
                const { data } = await api.get<GetLocationByIdResponse>(`/locations/${id}`);
                return mapLocation(data);
            },
            enabled: enabled && locationIds.length > 0,
        })),
    });

    return (
        locationQueries.map((q) => q.data).find((loc): loc is Location => Boolean(loc?.slug)) ??
        null
    );
}
