"use client";

import { useTranslations } from "next-intl";

export function Footer() {
    const generalTranslations = useTranslations("General");

    return (
        <footer>
            <div className="container">
                <div className="flex items-center justify-center gap-2 py-10">
                    <span>{generalTranslations("projectName")}</span>
                </div>
            </div>
        </footer>
    );
}
