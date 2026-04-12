"use client";

import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/routing";

export function LocaleSwitcherLinks() {
    const locale = useLocale();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const isPreview = searchParams.get("preview") === "1";
    const href = isPreview ? `${pathname}?preview=1` : pathname;

    return (
        <span className="flex items-center gap-1 font-mono text-[10px] tracking-[1.4px] uppercase">
            <Link
                href={href}
                locale="nl"
                className={`transition-colors ${
                    locale === "nl"
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                }`}
            >
                NL
            </Link>
            <span className="text-muted-foreground text-[8px]">/</span>
            <Link
                href={href}
                locale="en"
                className={`transition-colors ${
                    locale === "en"
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                }`}
            >
                EN
            </Link>
        </span>
    );
}
