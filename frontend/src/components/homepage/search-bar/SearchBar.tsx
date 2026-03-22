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
        <div className="border-muted/40 flex justify-center border-b px-10 py-5">
            <div className="relative w-[560px] max-w-full">
                <Search className="stroke-foreground pointer-events-none absolute top-1/2 left-0 h-4 w-4 -translate-y-1/2 fill-none stroke-[1.5]" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder={t("placeholder")}
                    autoComplete="off"
                    className="border-foreground font-body text-foreground placeholder:text-muted-foreground focus:border-foreground w-full border-b-2 border-none bg-transparent pr-24 pb-2 pl-7 text-sm outline-none"
                />
                <span className="text-muted-foreground absolute top-1/2 right-0 -translate-y-1/2 font-mono text-[9px] tracking-[1.2px] uppercase">
                    {t("hint")}
                </span>
            </div>
        </div>
    );
}
