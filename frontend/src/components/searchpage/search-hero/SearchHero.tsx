"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

const QUICK_TAGS = ["dance", "theater", "concert", "nightlife", "performance"] as const;

interface SearchHeroProps {
    query: string;
    onQueryChange: (query: string) => void;
    productionCount: number;
}

export function SearchHero({ query, onQueryChange, productionCount }: SearchHeroProps) {
    const t = useTranslations("Search");

    return (
        <div className="border-muted/30 flex flex-col items-center gap-5 border-b px-4 py-10 text-center sm:gap-6 sm:px-10 sm:py-12">
            <span className="text-muted-foreground font-mono text-[9px] tracking-[2px] uppercase">
                {t("heroEyebrow", { count: productionCount.toLocaleString() })}
            </span>

            <h1 className="font-display text-foreground text-[28px] leading-[1.1] font-bold tracking-[-0.025em] sm:text-[38px]">
                {t("heroTitle")}
                <br />
                <em className="text-foreground/45">{t("heroTitleItalic")}</em>
            </h1>

            <div className="relative w-full max-w-[680px]">
                <Search className="stroke-foreground pointer-events-none absolute top-1/2 left-0 h-5 w-5 -translate-y-1/2 fill-none stroke-[1.5]" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    placeholder={t("heroPlaceholder")}
                    autoComplete="off"
                    className="border-foreground font-display text-foreground placeholder:text-muted-foreground w-full border-b-2 bg-transparent pr-24 pb-3 pl-[34px] text-[18px] font-normal outline-none placeholder:italic sm:pr-28 sm:text-[22px]"
                />
                <span className="text-muted-foreground absolute top-1/2 right-0 hidden -translate-y-1/2 items-center gap-1.5 font-mono text-[9px] tracking-[1.2px] uppercase sm:flex">
                    enter{" "}
                    <kbd className="border-border text-muted-foreground flex items-center justify-center border px-[5px] py-0.5 font-mono text-[9px]">
                        ↵
                    </kbd>
                </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-muted-foreground mr-1 font-mono text-[9px] tracking-[1.2px] uppercase">
                    {t("quickSearch")}
                </span>
                {QUICK_TAGS.map((tag) => (
                    <button
                        key={tag}
                        onClick={() => onQueryChange(t(`tags.${tag}`))}
                        className="border-border text-muted-foreground hover:border-foreground hover:text-foreground cursor-pointer border px-2.5 py-1 font-mono text-[9px] tracking-[1.1px] uppercase transition-all"
                    >
                        {t(`tags.${tag}`)}
                    </button>
                ))}
            </div>
        </div>
    );
}
