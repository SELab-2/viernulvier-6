"use client";

import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/routing";

export function LocaleSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    function onSelectChange(nextLocale: string) {
        // Build URL with query params
        const queryString = searchParams.toString();
        const url = queryString ? `${pathname}?${queryString}` : pathname;

        // Navigate to new locale while preserving query params
        router.push(url, { locale: nextLocale });
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
