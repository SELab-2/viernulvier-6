"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface SearchBarProps {
    onSearch?: (query: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
    const [query, setQuery] = useState("");
    const t = useTranslations("Search");

    const handleChange = (value: string) => {
        setQuery(value);
        onSearch?.(value);
    };

    return (
        <div className="px-4 py-6 sm:px-10 sm:py-8">
            <div className="relative mx-auto w-full max-w-[640px]">
                <Search className="stroke-foreground pointer-events-none absolute top-1/2 left-0 h-5 w-5 -translate-y-1/2 fill-none stroke-[1.5] sm:h-6 sm:w-6" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder={t("placeholder")}
                    autoComplete="off"
                    className="border-foreground font-body text-foreground placeholder:text-muted-foreground w-full border-b-2 bg-transparent pr-24 pb-3 pl-9 text-base font-medium outline-none sm:pr-28 sm:pb-4 sm:pl-12 sm:text-lg"
                />
                <span className="text-muted-foreground absolute top-1/2 right-0 -translate-y-1/2 font-mono text-[9px] tracking-[1.2px] uppercase sm:text-[10px]">
                    {t("hint")}
                </span>
            </div>
        </div>
    );
}
