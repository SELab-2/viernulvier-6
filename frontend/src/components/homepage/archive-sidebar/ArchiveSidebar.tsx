"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";

import type { Location } from "@/types/models/location.types";

const CATEGORIES = ["artists", "productions", "articles", "posters"] as const;
const TAGS = [
    "theater",
    "dance",
    "concert",
    "nightlife",
    "performance",
    "comedy",
    "circus",
    "music",
    "spokenWord",
    "talks",
    "monument",
] as const;

interface ArchiveSidebarProps {
    locations?: Location[];
    // TODO: wire up onFilterChange to actually filter productions in the parent
    onFilterChange?: (filters: {
        categories: Set<string>;
        tags: Set<string>;
        locations: Set<string>;
    }) => void;
}

export function ArchiveSidebar({ locations = [] }: ArchiveSidebarProps) {
    const t = useTranslations("Sidebar");
    const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
    const [checkedCategories, setCheckedCategories] = useState<Set<string>>(
        new Set(["productions"])
    );
    const [checkedLocations, setCheckedLocations] = useState<Set<string>>(new Set());

    const toggleTag = useCallback((tag: string) => {
        setActiveTags((prev) => {
            const next = new Set(prev);
            if (next.has(tag)) {
                next.delete(tag);
            } else {
                next.add(tag);
            }
            return next;
        });
    }, []);

    const toggleCategory = useCallback((cat: string) => {
        setCheckedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(cat)) {
                next.delete(cat);
            } else {
                next.add(cat);
            }
            return next;
        });
    }, []);

    const toggleLocation = useCallback((locId: string) => {
        setCheckedLocations((prev) => {
            const next = new Set(prev);
            if (next.has(locId)) {
                next.delete(locId);
            } else {
                next.add(locId);
            }
            return next;
        });
    }, []);

    const clearAll = useCallback(() => {
        setActiveTags(new Set());
        setCheckedCategories(new Set());
        setCheckedLocations(new Set());
    }, []);

    return (
        <aside className="border-border w-[290px] shrink-0 border-r py-5 pb-10">
            <div className="mb-1 px-4 py-3">
                <h2 className="font-display text-2xl leading-relaxed font-medium">{t("title")}</h2>
                <div className="bg-foreground mt-1 h-0.5 w-10" />
            </div>

            <FilterGroup label={t("categories.label")}>
                <CheckboxList>
                    {CATEGORIES.map((cat) => (
                        <CheckboxItem
                            key={cat}
                            label={t(`categories.${cat}`)}
                            checked={checkedCategories.has(cat)}
                            onChange={() => toggleCategory(cat)}
                        />
                    ))}
                </CheckboxList>
            </FilterGroup>

            <FilterGroup label={t("tags.label")}>
                <div className="flex flex-wrap gap-2 pb-2.5">
                    {TAGS.map((tag) => (
                        <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className={`cursor-pointer border px-2 py-1 font-mono text-[10px] tracking-[1.1px] whitespace-nowrap uppercase transition-all ${
                                activeTags.has(tag)
                                    ? "bg-foreground text-background border-foreground"
                                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                            }`}
                        >
                            {t(`tags.${tag}`)}
                        </button>
                    ))}
                </div>
            </FilterGroup>

            <FilterGroup label={t("locations.label")}>
                <CheckboxList>
                    {locations.length > 0 ? (
                        locations.map((loc) => (
                            <CheckboxItem
                                key={loc.id}
                                label={loc.name ?? loc.address}
                                checked={checkedLocations.has(loc.id)}
                                onChange={() => toggleLocation(loc.id)}
                            />
                        ))
                    ) : (
                        // TODO: remove fallback locations once API has data
                        <CheckboxItem
                            label="De Vooruit"
                            checked={checkedLocations.has("deVooruit")}
                            onChange={() => toggleLocation("deVooruit")}
                        />
                    )}
                </CheckboxList>
            </FilterGroup>

            <FilterGroup label={t("year.label")}>
                <div className="flex flex-col gap-3.5 pb-2.5">
                    <div className="text-foreground flex justify-between font-mono text-[13px]">
                        <span>1980</span>
                        <span className="text-muted-foreground text-[11px]">—</span>
                        <span>2026</span>
                    </div>
                    <div className="bg-foreground h-0.5 w-full rounded-sm" />
                </div>
            </FilterGroup>

            <button
                onClick={clearAll}
                className="border-foreground text-foreground hover:bg-foreground hover:text-background mx-auto mt-4 block w-[230px] cursor-pointer border bg-transparent px-4 py-[9px] font-mono text-[10px] font-medium tracking-[1.4px] uppercase transition-all"
            >
                {t("clearAll")}
            </button>
        </aside>
    );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="border-border border-t px-5 py-2.5 pl-4 first:border-t-0">
            <span className="text-foreground mb-2.5 block font-mono text-[11px] font-medium tracking-[1.2px] uppercase">
                {label}
            </span>
            {children}
        </div>
    );
}

function CheckboxList({ children }: { children: React.ReactNode }) {
    return <div className="flex flex-col gap-2.5 pb-2.5">{children}</div>;
}

function CheckboxItem({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: () => void;
}) {
    return (
        <label className="flex cursor-pointer items-center gap-3">
            <input type="checkbox" checked={checked} onChange={onChange} className="hidden" />
            <div
                className={`border-foreground relative h-3.5 w-3.5 shrink-0 border transition-colors ${
                    checked ? "bg-foreground" : ""
                }`}
            >
                {checked && (
                    <div
                        className="bg-background absolute inset-[3px]"
                        style={{
                            clipPath:
                                "polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%)",
                        }}
                    />
                )}
            </div>
            <span className="font-body text-foreground text-[13px] leading-5 font-medium">
                {label}
            </span>
        </label>
    );
}
