"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/cms/PageHeader";
import { CollectionsTable } from "../../tables/collections/collections-table";

export default function CollectionsPage() {
    const t = useTranslations("Cms.Collections");
    const tHeader = useTranslations("Cms.PageHeader");

    return (
        <div className="flex h-full flex-col px-4 py-3">
            <PageHeader eyebrow={tHeader("collectionsEyebrow")} title={t("title")} />

            {/* Table - scrollable */}
            <div className="flex-1 overflow-auto">
                <CollectionsTable />
            </div>
        </div>
    );
}
