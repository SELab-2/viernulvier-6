"use client";

import { Search } from "lucide-react";
import { useState, useCallback } from "react";

interface SearchBarProps {
    onSearch?: (query: string) => void;
    placeholder?: string;
}

export function SearchBar({ onSearch, placeholder = "" }: SearchBarProps) {
    const [query, setQuery] = useState("");

    const handleSearch = useCallback(() => {
        onSearch?.(query);
    }, [query, onSearch]);

    return (
        <div className="group relative w-full max-w-[680px]">
            <Search className="stroke-foreground group-focus-within:stroke-primary pointer-events-none absolute top-1/2 left-0 h-5 w-5 -translate-y-1/2 fill-none stroke-[1.5] transition-colors" />

            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={placeholder}
                autoComplete="off"
                className="border-foreground font-display text-foreground placeholder:text-muted-foreground w-full border-b-2 bg-transparent pt-3 pr-24 pb-3 pl-[34px] text-[18px] leading-none font-normal transition-all outline-none placeholder:italic sm:pt-4 sm:pr-28 sm:pb-4 sm:text-[22px]"
            />

            <button
                onClick={handleSearch}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-0 flex -translate-y-1/2 cursor-pointer items-center gap-1.5 font-mono text-[9px] tracking-[1.2px] uppercase transition-colors"
            >
                enter{" "}
                <kbd className="border-border text-muted-foreground flex items-center justify-center border px-[5px] py-0.5 font-mono text-[9px]">
                    ↵
                </kbd>
            </button>

            <div className="bg-primary absolute -bottom-[2px] left-0 h-[2.5px] w-0 transition-all duration-500 group-focus-within:w-full group-focus-within:shadow-[0_4px_16px_rgba(var(--primary-rgb),0.6)]" />
        </div>
    );
}
