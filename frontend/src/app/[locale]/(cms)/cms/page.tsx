"use client";

import { useTranslations } from "next-intl";

import { DashboardCard, PageHeader } from "@/components/shared";

export default function CmsDashboardPage() {
    const adminTranslations = useTranslations("Admin");

    const userInfoSubtitle = <>{adminTranslations("welcomeBack")}</>;

    return (
        <div className="container mx-auto max-w-4xl px-4 py-12">
            <div className="flex flex-col gap-8">
                <PageHeader title={adminTranslations("title")} subtitle={userInfoSubtitle} />

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
