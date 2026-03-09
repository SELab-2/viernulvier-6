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
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
            <div className="flex flex-col gap-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
                <p className="text-muted-foreground text-sm">Enter your credentials to sign in</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <input
                        name="email"
                        type="email"
                        placeholder="Email"
                        required
                        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <input
                        name="password"
                        type="password"
                        placeholder="Password"
                        required
                        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>

                {isError && (
                    <div className="bg-destructive/10 border-destructive rounded-md border p-3">
                        <p className="text-destructive text-sm font-medium">
                            {isUnauthorized
                                ? "Invalid email or password."
                                : "Something went wrong. Please try again later."}
                        </p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-10 w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                >
                    {isPending ? "Logging in..." : "Login"}
                </button>
            </form>
        </div>
    );
}
