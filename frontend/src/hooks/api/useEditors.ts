import { useMutation } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { CreateEditorRequest, CreatedEditorResponse } from "@/types/api/auth.api.types";

export const useCreateEditor = () => {
    return useMutation({
        mutationFn: async (payload: CreateEditorRequest): Promise<CreatedEditorResponse> => {
            const { data } = await api.post<CreatedEditorResponse>("/editor/create", payload);
            return data;
        },
    });
};
