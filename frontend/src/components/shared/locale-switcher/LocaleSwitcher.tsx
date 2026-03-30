"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";

export function LocaleSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    function onSelectChange(nextLocale: string) {
        router.replace(pathname, { locale: nextLocale });
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
