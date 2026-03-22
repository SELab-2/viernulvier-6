"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

const NAV_LINKS = [
    { key: "productions", href: "/" },
    { key: "artists", href: "#" },
    { key: "articles", href: "#" },
    { key: "posters", href: "#" },
    { key: "collection", href: "#" },
    { key: "about", href: "#" },
];

export function Masthead() {
    const t = useTranslations("Masthead");

    return (
        <header className="border-foreground border-b-2">
            <div className="border-muted/60 flex items-baseline justify-between border-b px-10 pt-[18px] pb-2.5">
                <span className="text-muted-foreground font-mono text-[10px] tracking-[1.4px] uppercase">
                    {t("address")}
                </span>
                <nav className="flex items-center gap-7">
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.key}
                            href={link.href}
                            className="text-muted-foreground hover:text-foreground font-mono text-[10px] tracking-[1.4px] uppercase transition-colors"
                        >
                            {t(`nav.${link.key}`)}
                        </Link>
                    ))}
                </nav>
            </div>

            <div className="relative py-4 text-center">
                <h1 className="font-display text-foreground text-[72px] leading-none font-bold tracking-[-0.03em]">
                    VIERNULVIER
                </h1>
                <p className="text-muted-foreground mt-1.5 font-mono text-[10px] tracking-[2px] uppercase">
                    {t("subtitle")}
                </p>
            </div>

            <div className="flex items-center gap-3 pt-2 pb-2">
                <span className="bg-foreground h-px flex-1" />
                <em className="font-display text-muted-foreground text-[11px] whitespace-nowrap italic">
                    {t("genres")}
                </em>
                <span className="bg-foreground h-px flex-1" />
            </div>
        </header>
    );
}
