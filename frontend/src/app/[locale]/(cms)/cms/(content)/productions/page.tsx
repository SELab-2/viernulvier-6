"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/cms/PageHeader";
import { ProductionsTable } from "../../tables/productions/productions-table";

export default function ProductionsPage() {
    const t = useTranslations("Cms.Productions");
    const tHeader = useTranslations("Cms.PageHeader");

    return (
        <div className="flex h-full flex-col px-4 py-3">
            <PageHeader eyebrow={tHeader("productionsEyebrow")} title={t("title")} />

            {/* Table - scrollable */}
            <div className="flex-1 overflow-auto">
                <ProductionsTable />
            </div>
        </div>
    );
}
