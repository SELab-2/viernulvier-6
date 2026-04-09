"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/cms/PageHeader";
import { LocationsTable } from "../../tables/locations/locations-table";

export default function LocationsPage() {
    const t = useTranslations("Cms.Locations");
    const tHeader = useTranslations("Cms.PageHeader");

    return (
        <div className="flex h-full flex-col px-4 py-3">
            <PageHeader eyebrow={tHeader("locationsEyebrow")} title={t("title")} />

            {/* Table - scrollable */}
            <div className="flex-1 overflow-auto">
                <LocationsTable />
            </div>
        </div>
    );
}
