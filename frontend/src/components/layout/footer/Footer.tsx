"use client";

import { useTranslations } from "next-intl";

export function Footer() {
    const t = useTranslations("Footer");

    return (
        <footer className="border-foreground flex flex-col items-center gap-4 border-t-2 px-4 py-6 text-center sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:text-left">
            <div className="font-display text-lg font-bold">VIERNULVIER</div>
            <div className="text-muted-foreground font-mono text-[9px] leading-[1.8] tracking-[1.2px] uppercase">
                {t("address")}
                <br />
                {t("contact")}
            </div>
        </footer>
    );
}
