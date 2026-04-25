"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

interface ResultsBarProps {
    query: string;
    onQueryChange: (query: string) => void;
    onSearch: (query: string) => void;
    showSearch: boolean;
}

const SORT_OPTIONS = ["recent", "oldest", "az"] as const;

export function ResultsBar({ query, onQueryChange, onSearch, showSearch }: ResultsBarProps) {
    const t = useTranslations("ResultsBar");
    const tSearch = useTranslations("Search");
    const [activeSort, setActiveSort] = useState<string>("recent");

    const handleSort = useCallback((option: string) => {
        setActiveSort(option);
        // TODO: wire up actual sort logic when API supports it
    }, []);

    return (
        <div className="border-muted/30 bg-background sticky top-0 z-10 flex items-center gap-4 border-b px-4 py-4 sm:px-7">
            <div
                className={`flex min-w-0 flex-1 transition-all duration-300 ease-out ${
                    showSearch
                        ? "translate-y-0 opacity-100"
                        : "pointer-events-none -translate-y-1 opacity-0"
                }`}
                aria-hidden={!showSearch}
            >
                <div className="relative w-full max-w-[420px]">
                    <Search className="stroke-muted-foreground pointer-events-none absolute top-1/2 left-0 h-4 w-4 -translate-y-1/2 fill-none stroke-[1.5]" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => onQueryChange(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && onSearch(query)}
                        placeholder={tSearch("heroPlaceholder")}
                        autoComplete="off"
                        tabIndex={showSearch ? 0 : -1}
                        className="font-display text-foreground placeholder:text-muted-foreground border-foreground/40 focus:border-primary w-full border-b bg-transparent py-1 pr-2 pl-6 text-[15px] outline-none placeholder:italic"
                    />
                </div>
            </div>

            <div className="hidden items-center gap-4 sm:flex">
                <span className="text-muted-foreground font-mono text-[11px] tracking-[1.2px] uppercase">
                    {t("sortBy")}
                </span>
                {SORT_OPTIONS.map((option) => (
                    <button
                        key={option}
                        onClick={() => handleSort(option)}
                        className={`cursor-pointer border-b pb-0.5 font-mono text-[11px] tracking-[1.2px] uppercase transition-all ${
                            activeSort === option
                                ? "border-foreground text-foreground"
                                : "text-muted-foreground hover:text-foreground border-transparent"
                        }`}
                    >
                        {t(option)}
                    </button>
                ))}
            </div>
        </div>
    );
}
