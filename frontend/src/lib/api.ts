import { api } from "./api-client";
import { CreateAdminRequest, CreatedAdminResponse } from "@/types/api/auth.api.types";

export const createAdmin = async (data: CreateAdminRequest): Promise<CreatedAdminResponse> => {
    const response = await api.post<CreatedAdminResponse>("/admin/create", data);
    return response.data;
};
