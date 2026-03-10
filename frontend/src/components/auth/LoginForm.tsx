"use client";

import { useTranslations } from "next-intl";
import { AxiosError } from "axios";

import { useLogin } from "@/hooks/useAuth";
import { FormError, InputField, SubmitButton } from "@/components/form";

export function LoginForm() {
    const loginTranslations = useTranslations("Login");
    const { mutate, isPending, error, isError } = useLogin();

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        mutate({
            email: formData.get("email") as string,
            password: formData.get("password") as string,
        });
    };

    const axiosError = error as AxiosError;
    const isUnauthorized = axiosError?.response?.status === 401;
    const errorMessage = isError
        ? isUnauthorized
            ? loginTranslations("errorInvalidCredentials")
            : loginTranslations("errorGeneric")
        : null;

    return (
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
            <div className="flex flex-col gap-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">
                    {loginTranslations("title")}
                </h1>
                <p className="text-muted-foreground text-sm">{loginTranslations("subtitle")}</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <InputField
                    name="email"
                    type="email"
                    placeholder={loginTranslations("emailPlaceholder")}
                    required
                    autoComplete="email"
                    disabled={isPending}
                />

                <InputField
                    name="password"
                    type="password"
                    placeholder={loginTranslations("passwordPlaceholder")}
                    required
                    autoComplete="current-password"
                    disabled={isPending}
                />

                {errorMessage && <FormError message={errorMessage} />}

                <SubmitButton
                    isLoading={isPending}
                    loadingText={loginTranslations("submitButtonLoading")}
                >
                    {loginTranslations("submitButton")}
                </SubmitButton>
            </form>
        </div>
    );
}
