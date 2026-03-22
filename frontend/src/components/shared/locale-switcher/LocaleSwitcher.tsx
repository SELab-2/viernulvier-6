"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { useCallback } from "react";

export function LocaleSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const params = useParams();

    const switchLocale = useCallback(() => {
        const nextLocale = locale === "nl" ? "en" : "nl";
        router.replace({ pathname, query: params }, { locale: nextLocale });
    }, [locale, router, pathname, params]);

    return (
        <button
            onClick={switchLocale}
            className="text-muted-foreground hover:text-foreground cursor-pointer font-mono text-[10px] tracking-[1.4px] uppercase transition-colors"
        >
            {locale === "nl" ? "EN" : "NL"}
        </button>
    );
}
