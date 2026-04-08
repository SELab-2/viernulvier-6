"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/cms/PageHeader";
import { LocationsTable } from "../../tables/locations/locations-table";

export default function LocationsPage() {
    const t = useTranslations("Cms.Locations");
    const tHeader = useTranslations("Cms.PageHeader");

    return (
        <div className="flex h-full flex-col px-6 py-6">
            <PageHeader eyebrow={tHeader("locationsEyebrow")} title={t("title")} />

            {/* Table */}
            <div className="flex-1 overflow-y-auto">
                <LocationsTable />
            </div>
        </div>
    );
}
