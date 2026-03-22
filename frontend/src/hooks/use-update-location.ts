import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { api } from "@/lib/api";
import type { Venue } from "@/app/[locale]/(cms)/cms/tables/venues/columns";

export const useUpdateLocation = () => {
    const qc = useQueryClient();
    return useMutation<Venue, AxiosError, Venue>({
        mutationFn: async (venue) => {
            const { data } = await api.put<Venue>("/locations", venue);
            return data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["locations"] }),
    });
};
