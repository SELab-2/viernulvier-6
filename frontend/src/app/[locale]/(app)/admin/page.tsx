"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { useUser } from "@/hooks/useAuth";
import { useRouter } from "@/i18n/routing";
import { Spinner } from "@/components/ui/spinner";

export default function AdminPage() {
    const adminTranslations = useTranslations("Admin");
    const { data: user, isLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login");
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
                <Spinner className="text-primary size-8" />
                <p className="text-muted-foreground text-sm">{adminTranslations("loading")}</p>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="container mx-auto max-w-4xl px-4 py-12">
            <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">
                        {adminTranslations("title")}
                    </h1>
                    <p className="text-muted-foreground">
                        {adminTranslations("welcomeBack")}{" "}
                        {user?.email && (
                            <span>
                                {adminTranslations("emailLabel")}: {user.email}
                            </span>
                        )}
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="bg-card rounded-xl border p-6 shadow-sm">
                        <h3 className="font-semibold">{adminTranslations("quickActions")}</h3>
                        <p className="text-muted-foreground mt-2 text-sm italic">
                            {adminTranslations("comingSoon")}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
