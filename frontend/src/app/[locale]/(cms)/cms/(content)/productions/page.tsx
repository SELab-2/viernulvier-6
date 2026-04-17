"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/cms/PageHeader";
import { ProductionsTable } from "../../tables/productions/productions-table";

export default function ProductionsPage() {
    const t = useTranslations("Cms.Productions");
    const tEditions = useTranslations("Cms.editions");

    return (
        <div className="flex h-full flex-col px-3 py-1 lg:px-4 lg:py-3">
            <PageHeader eyebrow={tEditions("edition1")} title={t("title")} />

            {/* Table - scrollable */}
            <div className="flex-1 overflow-auto">
                <ProductionsTable />
            </div>
        </div>
    );
}
