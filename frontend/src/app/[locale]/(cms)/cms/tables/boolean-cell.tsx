"use client";

import { useTranslations } from "next-intl";

export function BooleanCell({ value }: { value: boolean | null }) {
    const t = useTranslations("Cms.EditSheet");
    return value === null ? "—" : value ? t("yes") : t("no");
}
