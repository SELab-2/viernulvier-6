"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";

interface ResultsBarProps {
    shownCount: number;
    totalCount: number;
}

const SORT_OPTIONS = ["recent", "oldest", "az"] as const;

export function ResultsBar({ shownCount, totalCount }: ResultsBarProps) {
    const t = useTranslations("ResultsBar");
    const [activeSort, setActiveSort] = useState<string>("recent");

    const handleSort = useCallback((option: string) => {
        setActiveSort(option);
        // TODO: wire up actual sort logic when API supports it
    }, []);

    return (
        <div className="border-muted/30 bg-background sticky top-0 z-10 flex items-center justify-between border-b px-4 py-2.5 sm:px-10">
            <span className="text-muted-foreground font-mono text-[10px] tracking-[1.2px] uppercase">
                <strong className="text-foreground">{shownCount}</strong> /{" "}
                <strong className="text-foreground">{totalCount.toLocaleString()}</strong>
            </span>
            <div className="hidden items-center gap-4 sm:flex">
                <span className="text-muted-foreground font-mono text-[9px] tracking-[1.2px] uppercase">
                    {t("sortBy")}
                </span>
                {SORT_OPTIONS.map((option) => (
                    <button
                        key={option}
                        onClick={() => handleSort(option)}
                        className={`cursor-pointer border-b pb-0.5 font-mono text-[9px] tracking-[1.2px] uppercase transition-all ${
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
