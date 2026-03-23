"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useCreateEditor } from "@/hooks/api";
import { FormError, InputField, SubmitButton } from "@/components/form";

export default function CreateEditorForm() {
    const t = useTranslations("Admin.CreateAdmin");
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
    });
    const { mutateAsync: createEditor, isPending: isLoading } = useCreateEditor();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            await createEditor(formData);
            toast.success(t("success"));
            setFormData({ username: "", email: "", password: "" }); // Reset form
        } catch {
            setError(t("errorMessage"));
            toast.error(t("error"));
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <FormError message={error} />}

            <InputField
                label={t("username")}
                name="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
            />

            <InputField
                label={t("email")}
                type="email"
                name="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
            />

            <InputField
                label={t("password")}
                type="password"
                name="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
            />

            <div className="pt-2">
                <SubmitButton isLoading={isLoading}>{t("submit")}</SubmitButton>
            </div>
        </form>
    );
}
