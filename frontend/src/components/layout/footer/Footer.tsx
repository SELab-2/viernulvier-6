"use client";

import { useTranslations } from "next-intl";

export function Footer() {
    const t = useTranslations("General");

    return (
        <footer>
            <div className="container">
                <div className="flex items-center justify-center gap-2 py-10">
                    <span>{t('projectName')}</span>
                </div>
            </div>
        </footer>
    );
}