"use client";

import { useState } from "react";
import { Search, Menu, X, ChevronDown, LogOut, User } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { Link as I18nLink, usePathname } from "@/i18n/routing";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { LocaleSwitcherLinks } from "@/components/shared/locale-switcher-links";
import { useUser, useLogout } from "@/hooks/useAuth";
import { UserRole } from "@/types/models/user.types";

interface UnifiedHeaderProps {
    query?: string;
    onQueryChange?: (query: string) => void;
    onSearch?: (query: string) => void;
    searchPlaceholder?: string;
    searchHint?: string;
}

function UserMenu() {
    const { data: user } = useUser();
    const logout = useLogout();
    const [open, setOpen] = useState(false);
    const t = useTranslations("Header");

    if (!user) return null;

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="group flex items-center gap-2 font-mono text-[9px] tracking-[1.4px] uppercase transition-colors"
            >
                <span className="text-muted-foreground group-hover:text-foreground hidden whitespace-nowrap sm:inline">
                    {user.email}
                </span>
                <span className="text-foreground flex h-6 w-6 items-center justify-center">
                    <User className="h-4 w-4" />
                </span>
                <ChevronDown
                    className={`text-muted-foreground h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0" onClick={() => setOpen(false)} />
                    <div className="bg-background border-foreground/10 absolute right-0 mt-2 w-40 border shadow-sm">
                        <button
                            onClick={() => {
                                setOpen(false);
                                logout.mutate();
                            }}
                            className="text-muted-foreground hover:bg-muted/50 hover:text-foreground flex w-full items-center gap-2 px-3 py-2.5 font-mono text-[9px] tracking-[1.4px] uppercase"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            {t("signOut")}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export function UnifiedHeader({
    query = "",
    onQueryChange,
    onSearch,
    searchPlaceholder = "Search...",
    searchHint = "↵ search",
}: UnifiedHeaderProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const pathname = usePathname();
    const t = useTranslations("Header.nav");
    const { data: user } = useUser();
    const isHome = pathname === "/" || pathname === "";
    const isSearch = pathname.startsWith("/search");
    const isArticles = pathname.startsWith("/articles");
    const isCms = pathname.startsWith("/cms") || pathname.startsWith("/admin");

    const navLinkClass = (active: boolean) =>
        `font-mono text-[9px] tracking-[1.4px] uppercase transition-colors ${
            active
                ? "border-b border-foreground pb-0.5 text-foreground"
                : "text-muted-foreground hover:text-foreground"
        }`;

    const localeSwitcher = <LocaleSwitcherLinks />;

    return (
        <header className="border-foreground border-b-2">
            {/* Desktop */}
            <div className="mx-auto hidden h-[52px] max-w-7xl items-stretch px-6 sm:flex sm:px-10">
                {/* Logo */}
                <div className="border-muted/30 mr-6 flex shrink-0 items-center border-r pr-6 sm:mr-7 sm:pr-7">
                    <Link
                        href="/"
                        className="font-display text-foreground text-[20px] font-bold tracking-[-0.03em] whitespace-nowrap sm:text-[22px]"
                    >
                        VIERNULVIER
                    </Link>
                </div>

                {/* Search - only show when not on home or search page */}
                <div className="flex flex-1 items-center">
                    {!isSearch && !isHome && onQueryChange && (
                        <div className="border-foreground relative flex w-full max-w-[500px] items-center border-b-[1.5px] pb-1.5">
                            <Search className="stroke-foreground h-[15px] w-[15px] flex-shrink-0 fill-none stroke-[1.5]" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => onQueryChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && onSearch) {
                                        onSearch(query);
                                    }
                                }}
                                placeholder={searchPlaceholder}
                                autoComplete="off"
                                className="font-body text-foreground placeholder:text-muted-foreground w-full bg-transparent pl-2 text-[13px] outline-none"
                            />
                            <span className="text-muted-foreground flex-shrink-0 font-mono text-[9px] tracking-[1.2px] uppercase">
                                {searchHint}
                            </span>
                        </div>
                    )}
                </div>

                {/* Nav + utilities */}
                <div className="border-muted/30 ml-6 flex shrink-0 items-center gap-4 border-l pl-6 sm:ml-7 sm:gap-5 sm:pl-7">
                    <I18nLink href="/" className={navLinkClass(isHome)}>
                        {t("home")}
                    </I18nLink>
                    <I18nLink href="/search" className={navLinkClass(isSearch)}>
                        {t("archive")}
                    </I18nLink>
                    <I18nLink href="/articles" className={navLinkClass(isArticles)}>
                        {t("articles")}
                    </I18nLink>
                    {user && (
                        <>
                            <span className="bg-border h-3 w-px" />
                            <I18nLink href="/cms" className={navLinkClass(isCms)}>
                                {t("cms")}
                            </I18nLink>
                        </>
                    )}
                    <span className="bg-border h-3 w-px" />
                    <ThemeSwitcher />
                    {localeSwitcher}
                    {user && (
                        <>
                            <span className="bg-border h-3 w-px" />
                            <UserMenu />
                        </>
                    )}
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
                    {localeSwitcher}
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
                    <I18nLink
                        href="/"
                        onClick={() => setMenuOpen(false)}
                        className={navLinkClass(isHome)}
                    >
                        {t("home")}
                    </I18nLink>
                    <I18nLink
                        href="/search"
                        onClick={() => setMenuOpen(false)}
                        className={navLinkClass(isSearch)}
                    >
                        {t("archive")}
                    </I18nLink>
                    <I18nLink
                        href="/articles"
                        onClick={() => setMenuOpen(false)}
                        className={navLinkClass(isArticles)}
                    >
                        {t("articles")}
                    </I18nLink>
                    {user && (
                        <>
                            <I18nLink
                                href="/cms"
                                onClick={() => setMenuOpen(false)}
                                className={navLinkClass(isCms)}
                            >
                                {t("cms")}
                            </I18nLink>
                            {user.role === UserRole.ADMIN && (
                                <I18nLink
                                    href="/admin"
                                    onClick={() => setMenuOpen(false)}
                                    className={navLinkClass(pathname.startsWith("/admin"))}
                                >
                                    {t("admin")}
                                </I18nLink>
                            )}
                        </>
                    )}
                </nav>
            )}
        </header>
    );
}
