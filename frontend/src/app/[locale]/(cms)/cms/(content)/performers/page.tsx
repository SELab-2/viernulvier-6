"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/cms/PageHeader";
import { PerformersTable } from "../../tables/performers/performers-table";

export default function PerformersPage() {
    const t = useTranslations("Cms.Performers");
    const tHeader = useTranslations("Cms.PageHeader");

    return (
        <div className="flex h-full flex-col px-4 py-3">
            <PageHeader eyebrow={tHeader("performersEyebrow")} title={t("title")} />

            {/* Table - scrollable */}
            <div className="flex-1 overflow-auto">
                <PerformersTable />
            </div>
        </div>
    );
}
