"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";

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
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="border-foreground">
            {/* Top bar */}
            <div className="border-muted/60 flex items-baseline justify-between border-b px-4 pt-4 pb-3 sm:px-10 sm:pt-[18px] sm:pb-2.5">
                <span className="text-muted-foreground hidden font-mono text-[10px] tracking-[1.4px] uppercase sm:inline">
                    {t("address")}
                </span>

                {/* Desktop nav */}
                <div className="hidden sm:flex sm:items-center sm:gap-5">
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
                    <span className="bg-border h-3 w-px" />
                    <ThemeSwitcher />
                    <LocaleSwitcher />
                </div>

                {/* Mobile: theme/locale + hamburger */}
                <div className="flex items-center gap-3 sm:hidden">
                    <ThemeSwitcher />
                    <LocaleSwitcher />
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="text-foreground cursor-pointer p-1"
                    >
                        {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile dropdown nav */}
            {menuOpen && (
                <nav className="border-muted/60 flex flex-col gap-4 border-b px-4 py-4 sm:hidden">
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.key}
                            href={link.href}
                            onClick={() => setMenuOpen(false)}
                            className="text-muted-foreground hover:text-foreground font-mono text-[10px] tracking-[1.4px] uppercase transition-colors"
                        >
                            {t(`nav.${link.key}`)}
                        </Link>
                    ))}
                </nav>
            )}

            {/* Title */}
            <div className="relative px-4 py-4 text-center sm:px-10">
                <h1 className="font-display text-foreground text-[40px] leading-none font-bold tracking-[-0.03em] sm:text-[56px] md:text-[72px]">
                    VIERNULVIER
                </h1>
                <p className="text-muted-foreground mt-1.5 font-mono text-[9px] tracking-[2px] uppercase sm:text-[10px]">
                    {t("subtitle")}
                </p>
            </div>

            {/* Genres bar */}
            <div className="flex items-center gap-3 px-4 pt-2 pb-2 sm:px-10">
                <span className="bg-foreground h-px flex-1" />
                <em className="font-display text-muted-foreground text-[12px] whitespace-nowrap italic sm:text-[14px]">
                    {t("genres")}
                </em>
                <span className="bg-foreground h-px flex-1" />
            </div>
        </header>
    );
}
