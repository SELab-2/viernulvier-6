"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/cms/PageHeader";
import { ProductionsTable } from "../../tables/productions/productions-table";

export default function ProductionsPage() {
    const t = useTranslations("Cms.Productions");
    const tHeader = useTranslations("Cms.PageHeader");

    return (
        <div className="flex h-full flex-col px-6 py-6">
            <PageHeader eyebrow={tHeader("productionsEyebrow")} title={t("title")} />

            {/* Table */}
            <div className="flex-1 overflow-y-auto">
                <ProductionsTable />
            </div>
        </div>
    );
}
