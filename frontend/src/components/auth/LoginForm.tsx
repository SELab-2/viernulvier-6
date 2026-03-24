"use client";

import { useTranslations } from "next-intl";
import { AxiosError } from "axios";

import { useLogin } from "@/hooks/useAuth";

export function LoginForm() {
    const loginTranslations = useTranslations("Login");
    const { mutate, isPending, error, isError } = useLogin();

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const email = form.email.value;
        const password = form.password.value;
        mutate({ email, password });
    };

    const axiosError = error as AxiosError;
    const isUnauthorized = axiosError?.response?.status === 401;
    const errorMessage = isError
        ? isUnauthorized
            ? loginTranslations("errorInvalidCredentials")
            : loginTranslations("errorGeneric")
        : null;

    return (
        <>
            <div className="mb-8 flex flex-col gap-2 text-center">
                <span className="text-muted-foreground font-mono text-[9px] tracking-[2px] uppercase">
                    Viernulvier
                </span>
                <h1 className="font-display text-foreground text-[28px] leading-[1.1] font-bold tracking-[-0.025em] sm:text-[34px]">
                    {loginTranslations("title")}
                </h1>
                <p className="font-body text-muted-foreground text-sm leading-relaxed">
                    {loginTranslations("subtitle")}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="relative">
                    <input
                        name="email"
                        type="email"
                        placeholder={loginTranslations("emailPlaceholder")}
                        required
                        autoComplete="email"
                        disabled={isPending}
                        className="border-foreground font-body text-foreground placeholder:text-muted-foreground w-full border-b-[1.5px] bg-transparent pb-3 text-[15px] outline-none disabled:opacity-50"
                    />
                </div>

                <div className="relative">
                    <input
                        name="password"
                        type="password"
                        placeholder={loginTranslations("passwordPlaceholder")}
                        required
                        autoComplete="current-password"
                        disabled={isPending}
                        className="border-foreground font-body text-foreground placeholder:text-muted-foreground w-full border-b-[1.5px] bg-transparent pb-3 text-[15px] outline-none disabled:opacity-50"
                    />
                </div>

                {errorMessage && (
                    <div className="border-destructive bg-destructive/5 border px-4 py-3">
                        <p className="text-destructive font-mono text-[10px] tracking-[0.5px]">
                            {errorMessage}
                        </p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="border-foreground text-foreground hover:bg-foreground hover:text-background mt-2 w-full cursor-pointer border bg-transparent px-4 py-3 font-mono text-[10px] font-medium tracking-[1.4px] uppercase transition-all disabled:opacity-50"
                >
                    {isPending
                        ? loginTranslations("submitButtonLoading")
                        : loginTranslations("submitButton")}
                </button>
            </form>
        </>
    );
}
