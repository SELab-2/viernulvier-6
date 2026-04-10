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
        // Preserve query params (like ?preview=1) when switching locale
        const queryString = searchParams.toString();
        const url = queryString ? `${pathname}?${queryString}` : pathname;
        router.replace(url, { locale: nextLocale });
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
