"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/cms/PageHeader";
import { SeriesTable } from "../../tables/series/series-table";

export default function SeriesPage() {
    const t = useTranslations("Cms.Series");
    const tEditions = useTranslations("Cms.editions");

    return (
        <div className="flex h-full flex-col px-3 py-1 lg:px-4 lg:py-3">
            <PageHeader eyebrow={tEditions("edition5")} title={t("title")} />

            {/* Table - scrollable */}
            <div className="flex-1 overflow-auto">
                <SeriesTable />
            </div>
        </div>
    );
}
