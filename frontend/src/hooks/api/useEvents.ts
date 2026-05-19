import {
    keepPreviousData,
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import {
    mapCreateEventInput,
    mapEvent,
    mapEvents,
    mapPaginatedEventsResult,
    mapUpdateEventInput,
} from "@/mappers/event.mapper";
import {
    CreateEventResponse,
    GetAllEventsResponse,
    GetEventByIdResponse,
    GetEventsByProductionIdResponse,
    UpdateEventResponse,
} from "@/types/api/event.api.types";
import { PaginationParams, PaginatedResult } from "@/types/api/api.types";
import { Event, EventCreateInput, EventUpdateInput } from "@/types/models/event.types";

import { queryKeys } from "./query-keys";

const fetchEvents = async (params?: PaginationParams): Promise<PaginatedResult<Event>> => {
    const { data } = await api.get<GetAllEventsResponse>("/events", { params });
    return mapPaginatedEventsResult(data);
};

const fetchEventById = async (id: string): Promise<Event> => {
    const { data } = await api.get<GetEventByIdResponse>(`/events/${id}`);
    return mapEvent(data);
};

const fetchEventsByProductionId = async (productionId: string): Promise<Event[]> => {
    const { data } = await api.get<GetEventsByProductionIdResponse>(
        `/productions/${productionId}/events`
    );
    return mapEvents(data);
};

const fetchEventsByProductionIds = async (ids: string[]): Promise<Event[]> => {
    if (ids.length === 0) return [];
    const { data } = await api.get<GetAllEventsResponse>("/events", {
        params: { production_ids: ids.join(",") },
    });
    return mapEvents(data.data);
};

export const useGetEvents = (options?: { enabled?: boolean; pagination?: PaginationParams }) => {
    return useQuery({
        queryKey: queryKeys.events.all(options?.pagination),
        queryFn: () => fetchEvents(options?.pagination),
        ...options,
    });
};

export const useGetEventsByProductionIds = (ids: string[], options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.events.byProductionIds(ids),
        queryFn: () => fetchEventsByProductionIds(ids),
        enabled: ids.length > 0 && (options?.enabled ?? true),
        placeholderData: keepPreviousData,
    });
};

export const useGetInfiniteEvents = (limit: number = 100) => {
    return useInfiniteQuery({
        queryKey: ["events", "infinite"],
        queryFn: async ({ pageParam }) => fetchEvents({ limit, cursor: pageParam }),
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
        initialPageParam: null as string | null,
    });
};

export const useGetEvent = (id: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.events.detail(id),
        queryFn: () => fetchEventById(id),
        enabled: Boolean(id) && (options?.enabled ?? true),
    });
};

export const useGetEventsByProduction = (productionId: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.productions.events(productionId),
        queryFn: () => fetchEventsByProductionId(productionId),
        enabled: Boolean(productionId) && (options?.enabled ?? true),
    });
};

export const useCreateEvent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: EventCreateInput) => {
            const { data } = await api.post<CreateEventResponse>(
                "/events",
                mapCreateEventInput(payload)
            );
            return mapEvent(data);
        },
        onSuccess: (event) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.events.all() });
            queryClient.invalidateQueries({
                queryKey: queryKeys.productions.events(event.productionId),
            });
            queryClient.invalidateQueries({
                queryKey: ["events", "byProductionIds"],
            });
            queryClient.invalidateQueries({
                queryKey: ["events", "infinite"],
            });
        },
    });
};

export const useUpdateEvent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: EventUpdateInput) => {
            const { data } = await api.put<UpdateEventResponse>(
                "/events",
                mapUpdateEventInput(payload)
            );
            return mapEvent(data);
        },
        onSuccess: (event) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.events.all() });
            queryClient.setQueryData(queryKeys.events.detail(event.id), event);
            queryClient.invalidateQueries({
                queryKey: queryKeys.productions.events(event.productionId),
            });
            queryClient.invalidateQueries({
                queryKey: ["events", "byProductionIds"],
            });
            queryClient.invalidateQueries({
                queryKey: ["events", "infinite"],
            });
        },
    });
};

export const useDeleteEvent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/events/${id}`);
            return id;
        },
        onSuccess: (id) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.events.all() });
            queryClient.removeQueries({ queryKey: queryKeys.events.detail(id) });
        },
    });
};
