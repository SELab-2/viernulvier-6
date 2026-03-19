"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { useUser } from "@/hooks/useAuth";
import { useRouter } from "@/i18n/routing";
import { DashboardCard, LoadingState, PageHeader } from "@/components/shared";
import { UserRole } from "@/types/models/user.types";
import CreateEditorForm from "@/components/admin/CreateEditorForm";

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
        return <LoadingState message={adminTranslations("loading")} spinnerSize="lg" />;
    }

    if (!user) {
        return null;
    }

    const userInfoSubtitle = (
        <>
            {adminTranslations("welcomeBack")}{" "}
            {user?.email && (
                <span>
                    {adminTranslations("emailLabel")}: {user.email}
                </span>
            )}
        </>
    );

    return (
        <div className="container mx-auto max-w-4xl px-4 py-12">
            <div className="flex flex-col gap-8">
                <PageHeader title={adminTranslations("title")} subtitle={userInfoSubtitle} />

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {user.role === UserRole.ADMIN && (
                        <div className="md:col-span-2 lg:col-span-2">
                            <DashboardCard title={adminTranslations("CreateAdmin.title")}>
                                <CreateEditorForm />
                            </DashboardCard>
                        </div>
                    )}

                    <DashboardCard title={adminTranslations("quickActions")}>
                        <p className="text-muted-foreground text-sm italic">
                            {adminTranslations("comingSoon")}
                        </p>
                    </DashboardCard>
                </div>
            </div>
        </div>
    );
}
