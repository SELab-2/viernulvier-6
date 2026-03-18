import { api } from "./api-client";
import { CreateAdminRequest, AdminResponse } from "@/types/dto/auth.types";

export const createAdmin = async (data: CreateAdminRequest): Promise<AdminResponse> => {
    const response = await api.post<AdminResponse>("/admin/create", data);
    return response.data;
};
