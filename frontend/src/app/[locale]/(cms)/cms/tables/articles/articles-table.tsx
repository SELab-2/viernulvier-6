"use client";

import { useTranslations } from "next-intl";

export function ArticlesTable() {
    const t = useTranslations("Cms.Articles");
    return <div className="text-muted-foreground text-sm">{t("notAvailable")}</div>;
}
