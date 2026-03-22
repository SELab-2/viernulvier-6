import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { api } from "@/lib/api";
import type { Production } from "@/app/[locale]/(cms)/cms/tables/productions/columns";

export const useUpdateProduction = () => {
    const qc = useQueryClient();
    return useMutation<Production, AxiosError, Production>({
        mutationFn: async (production) => {
            const { data } = await api.put<Production>("/productions", production);
            return data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["productions"] }),
    });
};
