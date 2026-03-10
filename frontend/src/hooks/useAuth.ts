import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useRouter } from "@/i18n/routing";
import { LoginDTO, AdminUser } from "@/types/auth.types";
import { AxiosError } from "axios";
import { toast } from "sonner";

export const useUser = (options?: { enabled?: boolean }) => {
    return useQuery<AdminUser>({
        queryKey: ["user"],
        queryFn: async () => {
            const { data } = await api.get("/admin/me");
            return data;
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

    return useMutation({
        mutationFn: async (credentials: LoginDTO) => {
            const { data } = await api.post("/auth/login", credentials);
            return data;
        },
        onSuccess: async () => {
            await queryClient.refetchQueries({ queryKey: ["user"] });
            router.push("/admin");
        },
        onError: (error: AxiosError) => {
            if (error.response?.status === 401) {
                toast.error("Invalid email or password");
            } else {
                toast.error("An error occurred during login");
            }
        },
    });
};

export const useLogout = () => {
    const queryClient = useQueryClient();
    const router = useRouter();

    return useMutation({
        mutationFn: async () => {
            await api.post("/auth/logout");
        },
        onSuccess: () => {
            queryClient.clear();
            router.push("/login");
            toast.success("Logged out successfully");
        },
        onError: () => {
            toast.error("An error occurred during logout");
            queryClient.clear();
            router.push("/login");
        },
    });
};
