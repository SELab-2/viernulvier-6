import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { api } from "@/lib/api";
import type { Venue } from "@/app/[locale]/(cms)/cms/tables/venues/columns";

export const useLocations = () =>
    useQuery<Venue[], AxiosError>({
        queryKey: ["locations"],
        queryFn: async () => {
            const { data } = await api.get<Venue[]>("/locations");
            return data;
        },
    });
