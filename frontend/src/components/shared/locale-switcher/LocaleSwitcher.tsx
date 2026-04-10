"use client";

import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/routing";

export function LocaleSwitcher() {
    const locale = useLocale();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    function onSelectChange(nextLocale: string) {
        // Build full URL with query params - NEVER strip them
        const queryString = searchParams.toString();
        const newPath = `/${nextLocale}${pathname}`;
        const url = queryString ? `${newPath}?${queryString}` : newPath;

        // Use native navigation to preserve all query params
        window.location.href = url;
    }

    return (
        <button
            type="button"
            onClick={() => onSelectChange(locale === "nl" ? "en" : "nl")}
            className="text-muted-foreground hover:text-foreground cursor-pointer font-mono text-[10px] tracking-[1.4px] uppercase transition-colors"
        >
            {locale === "nl" ? "EN" : "NL"}
        </button>
    );
}
