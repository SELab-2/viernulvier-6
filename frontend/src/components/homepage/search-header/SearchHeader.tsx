"use client";

import { useState } from "react";
import { Search, Menu, X } from "lucide-react";
import Link from "next/link";

import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";

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

    return (
        <header className="border-foreground border-b-2">
            {/* Desktop */}
            <div className="hidden h-[52px] items-stretch sm:flex">
                <div className="border-muted/30 mr-7 flex shrink-0 items-center border-r pr-7">
                    <Link
                        href="/"
                        className="font-display text-foreground text-[22px] font-bold tracking-[-0.03em] whitespace-nowrap"
                    >
                        VIERNULVIER
                    </Link>
                </div>

                <div className="flex flex-1 items-center">
                    <div className="relative w-full max-w-[600px]">
                        <Search className="stroke-foreground pointer-events-none absolute top-1/2 left-0 h-[15px] w-[15px] -translate-y-1/2 fill-none stroke-[1.5]" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => onQueryChange(e.target.value)}
                            placeholder={searchPlaceholder}
                            autoComplete="off"
                            className="border-foreground font-body text-foreground placeholder:text-muted-foreground w-full border-b-[1.5px] bg-transparent pr-20 pb-1.5 pl-[26px] text-sm outline-none"
                        />
                        <span className="text-muted-foreground absolute top-1/2 right-0 -translate-y-1/2 font-mono text-[9px] tracking-[1.2px] uppercase">
                            {searchHint}
                        </span>
                    </div>
                </div>

                <div className="border-muted/30 ml-7 flex shrink-0 items-center gap-5 border-l pl-7">
                    <Link
                        href="/"
                        className="text-muted-foreground hover:text-foreground font-mono text-[9px] tracking-[1.4px] uppercase transition-colors"
                    >
                        Home
                    </Link>
                    <Link
                        href="/search"
                        className="text-foreground font-mono text-[9px] tracking-[1.4px] uppercase"
                    >
                        Archief
                    </Link>
                    <span className="bg-border h-3 w-px" />
                    <ThemeSwitcher />
                    <LocaleSwitcher />
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
                    <LocaleSwitcher />
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
                        className="text-muted-foreground hover:text-foreground font-mono text-[10px] tracking-[1.4px] uppercase transition-colors"
                    >
                        Home
                    </Link>
                    <Link
                        href="/search"
                        onClick={() => setMenuOpen(false)}
                        className="text-foreground font-mono text-[10px] tracking-[1.4px] uppercase"
                    >
                        Archief
                    </Link>
                </nav>
            )}
        </header>
    );
}
