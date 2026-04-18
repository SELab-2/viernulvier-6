"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/cms/PageHeader";
import { PerformersTable } from "../../tables/performers/performers-table";

export default function PerformersPage() {
    const t = useTranslations("Cms.Performers");
    const tEditions = useTranslations("Cms.editions");

    return (
        <div className="flex h-full flex-col px-3 py-1 lg:px-4 lg:py-3">
            <PageHeader eyebrow={tEditions("edition4")} title={t("title")} />

            {/* Table - scrollable */}
            <div className="flex-1 overflow-auto">
                <PerformersTable />
            </div>
        </div>
    );
}
