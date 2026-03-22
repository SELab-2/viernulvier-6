import { api } from "./api-client";
import { CreateEditorRequest, CreatedEditorResponse } from "@/types/api/auth.api.types";

export const createEditor = async (data: CreateEditorRequest): Promise<CreatedEditorResponse> => {
    const response = await api.post<CreatedEditorResponse>("/editor/create", data);
    return response.data;
};
