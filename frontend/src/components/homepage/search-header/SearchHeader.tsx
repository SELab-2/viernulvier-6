"use client";

import { useState } from "react";
import { Search, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";

import { Link } from "@/i18n/routing";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";

interface SearchHeaderProps {
    query: string;
    onQueryChange: (query: string) => void;
    searchPlaceholder: string;
    searchHint: string;
}

export function SearchHeader({
    query,
    onQueryChange,
    searchPlaceholder,
    searchHint,
}: SearchHeaderProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const pathname = usePathname();
    const locale = useLocale();
    const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;
    const isSearch = pathname.startsWith(`/${locale}/search`);
    const otherLocale = locale === "nl" ? "en" : "nl";

    const navLinkClass = (active: boolean) =>
        `font-mono text-[9px] tracking-[1.4px] uppercase transition-colors ${
            active
                ? "text-foreground border-b border-foreground pb-0.5"
                : "text-muted-foreground hover:text-foreground"
        }`;

    return (
        <header className="border-foreground border-b-2">
            {/* Desktop */}
            <div className="mx-auto flex h-[52px] max-w-[1400px] items-stretch px-6 sm:px-10">
                {/* Logo */}
                <div className="border-muted/30 mr-6 flex shrink-0 items-center border-r pr-6 sm:mr-7 sm:pr-7">
                    <Link
                        href="/"
                        className="font-display text-foreground text-[20px] font-bold tracking-[-0.03em] whitespace-nowrap sm:text-[22px]"
                    >
                        VIERNULVIER
                    </Link>
                </div>

                {/* Search */}
                <div className="flex flex-1 items-center">
                    <div className="relative w-full max-w-[500px]">
                        <Search className="stroke-foreground pointer-events-none absolute top-1/2 left-0 h-[15px] w-[15px] -translate-y-1/2 fill-none stroke-[1.5]" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => onQueryChange(e.target.value)}
                            placeholder={searchPlaceholder}
                            autoComplete="off"
                            className="border-foreground font-body text-foreground placeholder:text-muted-foreground w-full border-b-[1.5px] bg-transparent pr-16 pb-1.5 pl-[26px] text-[13px] outline-none"
                        />
                        <span className="text-muted-foreground absolute top-1/2 right-0 -translate-y-1/2 font-mono text-[9px] tracking-[1.2px] uppercase">
                            {searchHint}
                        </span>
                    </div>
                </div>

                {/* Nav + utilities */}
                <div className="border-muted/30 ml-6 flex shrink-0 items-center gap-4 border-l pl-6 sm:ml-7 sm:gap-5 sm:pl-7">
                    <Link href="/" className={navLinkClass(isHome)}>
                        Home
                    </Link>
                    <Link href="/search" className={navLinkClass(isSearch)}>
                        Archief
                    </Link>
                    <span className="bg-border h-3 w-px" />
                    <ThemeSwitcher />
                    <Link
                        href={pathname}
                        locale={otherLocale}
                        className="text-muted-foreground hover:text-foreground font-mono text-[10px] tracking-[1.4px] uppercase transition-colors"
                    >
                        {otherLocale.toUpperCase()}
                    </Link>
                </div>
            </div>

            {/* Mobile */}
            <div className="flex items-center justify-between px-4 py-3 sm:hidden">
                <Link
                    href="/"
                    className="font-display text-foreground text-[20px] font-bold tracking-[-0.03em]"
                >
                    VIERNULVIER
                </Link>
                <div className="flex items-center gap-3">
                    <ThemeSwitcher />
                    <Link
                        href={pathname}
                        locale={otherLocale}
                        className="text-muted-foreground hover:text-foreground font-mono text-[10px] tracking-[1.4px] uppercase transition-colors"
                    >
                        {otherLocale.toUpperCase()}
                    </Link>
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="text-foreground cursor-pointer p-1"
                    >
                        {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {menuOpen && (
                <nav className="border-muted/30 flex flex-col gap-4 border-t px-4 py-4 sm:hidden">
                    <Link
                        href="/"
                        onClick={() => setMenuOpen(false)}
                        className={navLinkClass(isHome)}
                    >
                        Home
                    </Link>
                    <Link
                        href="/search"
                        onClick={() => setMenuOpen(false)}
                        className={navLinkClass(isSearch)}
                    >
                        Archief
                    </Link>
                </nav>
            )}
        </header>
    );
}
