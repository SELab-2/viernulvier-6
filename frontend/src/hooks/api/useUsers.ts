import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import {
    CreateUserRequest,
    CreateUserResponse,
    GetUsersResponse,
    UpdateUserRequest,
    UpdateUserResponse,
    UserResponse,
    UserRole,
} from "@/types/api/user.api.types";
import { queryKeys } from "./query-keys";

export type User = UserResponse;
export type CreateUserInput = CreateUserRequest;
export type UpdateUserInput = UpdateUserRequest;
export type { UserRole };

export const useGetUsers = (options?: { enabled?: boolean; retry?: boolean }) => {
    return useQuery({
        queryKey: queryKeys.users.all(),
        queryFn: async (): Promise<GetUsersResponse> => {
            const { data } = await api.get<GetUsersResponse>("/users");
            return data;
        },
        ...options,
    });
};

export const useCreateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: CreateUserInput): Promise<CreateUserResponse> => {
            const { data } = await api.post<CreateUserResponse>("/users", payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
        },
    });
};

export const useUpdateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            payload,
        }: {
            id: string;
            payload: UpdateUserInput;
        }): Promise<UpdateUserResponse> => {
            const { data } = await api.put<UpdateUserResponse>(`/users/${id}`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
        },
    });
};

export const useDeleteUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/users/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
        },
    });
};
