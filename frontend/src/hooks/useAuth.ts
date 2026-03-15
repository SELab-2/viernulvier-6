import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useRouter } from "@/i18n/routing";
import { LoginDTO } from "@/types/dto/auth.types";
import { User } from "@/types/models/user.types";
import { UserResponse } from "@/types/api/auth.api.types";
import { mapUser } from "@/mappers/user.mapper";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export const useUser = (options?: { enabled?: boolean }) => {
    return useQuery<User>({
        queryKey: ["user"],
        queryFn: async () => {
            const { data } = await api.get<UserResponse>("/editor/me");
            return mapUser(data);
        },
        retry: false,
        staleTime: 2.5 * 60_000,
        refetchOnMount: true,
        ...options,
    });
};

export const useLogin = () => {
    const queryClient = useQueryClient();
    const router = useRouter();
    const t = useTranslations("Login");

    return useMutation({
        mutationFn: async (credentials: LoginDTO) => {
            const { data } = await api.post("/auth/login", credentials);
            return data;
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ["user"] });
            router.push("/cms");
        },
        onError: (error: AxiosError) => {
            if (error.response?.status === 401) {
                toast.error(t("errorInvalidCredentials"));
            } else {
                toast.error(t("errorGeneric"));
            }
        },
    });
};

export const useLogout = () => {
    const queryClient = useQueryClient();
    const router = useRouter();
    const t = useTranslations("Login");

    return useMutation({
        mutationFn: async () => {
            await api.post("/auth/logout");
        },
        onSuccess: () => {
            queryClient.removeQueries({ queryKey: ["user"] });
            router.push("/login");
            toast.success(t("loggedOut"));
        },
        onError: () => {
            toast.error(t("errorGeneric"));
            queryClient.removeQueries({ queryKey: ["user"] });

            router.push("/login");
        },
    });
};
