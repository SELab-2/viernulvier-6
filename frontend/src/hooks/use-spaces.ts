import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { api } from "@/lib/api";

export type Space = {
    id: string;
    source_id: number | null;
    name_nl: string;
    location_id: string;
};

export const useSpaces = () =>
    useQuery<Space[], AxiosError>({
        queryKey: ["spaces"],
        queryFn: async () => {
            const { data } = await api.get<Space[]>("/spaces");
            return data;
        },
    });
