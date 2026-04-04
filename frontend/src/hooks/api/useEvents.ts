import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import {
    mapCreateEventInput,
    mapEvent,
    mapEvents,
    mapUpdateEventInput,
} from "@/mappers/event.mapper";
import { EventResponse } from "@/types/api/event.api.types";
import { Event, EventCreateInput, EventUpdateInput } from "@/types/models/event.types";

import { queryKeys } from "./query-keys";

const fetchEvents = async (): Promise<Event[]> => {
    const { data } = await api.get<{ data: EventResponse[] }>("/events");
    return mapEvents(data.data);
};

const fetchEventById = async (id: string): Promise<Event> => {
    const { data } = await api.get<EventResponse>(`/events/${id}`);
    return mapEvent(data);
};

const fetchEventsByProductionId = async (productionId: string): Promise<Event[]> => {
    const { data } = await api.get<EventResponse[]>(`/productions/${productionId}/events`);
    return mapEvents(data);
};

export const useGetEvents = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.events.all,
        queryFn: fetchEvents,
        ...options,
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
            const { data } = await api.post<EventResponse>("/events", mapCreateEventInput(payload));
            return mapEvent(data);
        },
        onSuccess: (event) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
            queryClient.invalidateQueries({
                queryKey: queryKeys.productions.events(event.productionId),
            });
        },
    });
};

export const useUpdateEvent = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: EventUpdateInput) => {
            const { data } = await api.put<EventResponse>("/events", mapUpdateEventInput(payload));
            return mapEvent(data);
        },
        onSuccess: (event) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
            queryClient.setQueryData(queryKeys.events.detail(event.id), event);
            queryClient.invalidateQueries({
                queryKey: queryKeys.productions.events(event.productionId),
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
            queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
            queryClient.removeQueries({ queryKey: queryKeys.events.detail(id) });
        },
    });
};
