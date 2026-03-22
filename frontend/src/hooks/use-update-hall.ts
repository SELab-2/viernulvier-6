import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { api } from "@/lib/api";
import type { Hall } from "@/app/[locale]/(cms)/cms/tables/venues/hall-columns";

export const useUpdateHall = () => {
    const qc = useQueryClient();
    return useMutation<Hall, AxiosError, Hall>({
        mutationFn: async (hall) => {
            const { data } = await api.put<Hall>("/halls", hall);
            return data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["halls"] }),
    });
};
