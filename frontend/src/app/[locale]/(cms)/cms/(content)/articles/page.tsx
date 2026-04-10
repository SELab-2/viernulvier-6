"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/cms/PageHeader";
import { ArticlesTable } from "../../tables/articles/articles-table";

export default function ArticlesPage() {
    const t = useTranslations("Cms.Articles");
    const tEditions = useTranslations("Cms.editions");

    return (
        <div className="flex h-full flex-col px-4 py-3">
            <PageHeader eyebrow={tEditions("edition3")} title={t("title")} />

            {/* Table - scrollable */}
            <div className="flex-1 overflow-auto">
                <ArticlesTable />
            </div>
        </div>
    );
}
