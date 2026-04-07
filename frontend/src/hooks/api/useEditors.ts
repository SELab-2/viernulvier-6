import { useMutation } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { CreateEditorRequest, CreateEditorResponse } from "@/types/api/auth.api.types";

export const useCreateEditor = () => {
    return useMutation({
        mutationFn: async (payload: CreateEditorRequest): Promise<CreateEditorResponse> => {
            const { data } = await api.post<CreateEditorResponse>("/editor/create", payload);
            return data;
        },
    });
};
