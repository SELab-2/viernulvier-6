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

        // When in iframe/preview mode, always preserve the preview param
        const isInIframe = typeof window !== "undefined" && window.self !== window.top;
        const hasPreviewParam = searchParams.get("preview") === "1";

        let url = pathname;
        if (queryString) {
            url = `${pathname}?${queryString}`;
        } else if (isInIframe && !hasPreviewParam) {
            // If in iframe but no preview param, check if we should add it
            // (this can happen if the param was lost during navigation)
            url = `${pathname}?preview=1`;
        }

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
