import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { api } from "@/lib/api";
import type { Hall } from "@/app/[locale]/(cms)/cms/tables/venues/hall-columns";

export type HallWithLocationId = Hall & { location_id: string };

export const useHalls = () =>
    useQuery<Hall[], AxiosError>({
        queryKey: ["halls"],
        queryFn: async () => {
            const { data } = await api.get<Hall[]>("/halls");
            return data;
        },
    });
