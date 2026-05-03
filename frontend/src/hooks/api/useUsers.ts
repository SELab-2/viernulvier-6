import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { queryKeys } from "./query-keys";

export type UserRole = "admin" | "editor" | "user";

export type User = {
    id: string;
    username: string;
    email: string;
    role: UserRole;
};

export type CreateUserInput = {
    username: string;
    email: string;
    password: string;
    role: UserRole;
};

export type UpdateUserInput = {
    username: string;
    role: UserRole;
};

export const useGetUsers = () => {
    return useQuery({
        queryKey: queryKeys.users.all(),
        queryFn: async (): Promise<User[]> => {
            const { data } = await api.get("/users");
            return data;
        },
    });
};

export const useCreateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: CreateUserInput) => {
            const { data } = await api.post("/users", payload);
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
        mutationFn: async ({ id, payload }: { id: string; payload: UpdateUserInput }) => {
            const { data } = await api.put(`/users/${id}`, payload);
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
