"use client";
import { useLogin } from "@/hooks/useAuth";
import { AxiosError } from "axios";

export function LoginForm() {
    const { mutate, isPending, error, isError } = useLogin();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        mutate({
            email: formData.get("email") as string,
            password: formData.get("password") as string,
        });
    };

    const axiosError = error as AxiosError;
    const isUnauthorized = axiosError?.response?.status === 401;

    return (
        <form onSubmit={handleSubmit}>
            <input name="email" type="email" required />
            <input name="password" type="password" required />

            {/* 3. Display the error visually */}
            {isError && (
                <p style={{ color: "red", fontSize: "0.875rem" }}>
                    {isUnauthorized
                        ? "Invalid email or password."
                        : "Something went wrong. Please try again."}
                </p>
            )}

            <button type="submit" disabled={isPending}>
                {isPending ? "Logging in..." : "Login"}
            </button>
        </form>
    );
}
