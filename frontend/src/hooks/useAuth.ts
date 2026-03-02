import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { LoginDTO, AuthResponse } from "@/types/auth.types";
import { AxiosError } from "axios";
import { toast } from "sonner";

export const useLogin = () => {
    const queryClient = useQueryClient();
    const router = useRouter();

    return useMutation({
        mutationFn: async (credentials: LoginDTO) => {
            const { data } = await api.post("/login", credentials);
            return data;
        },
        onSuccess: (data: AuthResponse) => {
            Cookies.set("jwt", data.token, { secure: true, sameSite: "strict" });
            queryClient.setQueryData(["user"], data.user);
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
