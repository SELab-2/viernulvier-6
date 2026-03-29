"use client";

import { useTranslations } from "next-intl";

export function PerformersTable() {
    const t = useTranslations("Cms.Performers");
    return <div className="text-muted-foreground text-sm">{t("notAvailable")}</div>;
}
