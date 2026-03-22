import { useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { api } from "@/lib/api";
import type { Production } from "@/app/[locale]/(cms)/cms/tables/productions/columns";

export const useProductions = () =>
    useQuery<Production[], AxiosError>({
        queryKey: ["productions"],
        queryFn: async () => {
            const { data } = await api.get<Production[]>("/productions");
            return data;
        },
    });
