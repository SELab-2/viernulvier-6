"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { SlidersHorizontal, X } from "lucide-react";

import type { Location } from "@/types/models/location.types";
import type { Facet } from "@/types/models/taxonomy.types";
import { getLabel } from "@/lib/utils";

const CATEGORIES = ["artists", "productions", "articles", "posters"] as const;

interface ArchiveSidebarProps {
    locations?: Location[];
    facets?: Facet[];
    minYear: number;
    maxYear: number;
    onFilterChange?: (filters: {
        categories: Set<string>;
        tags: Set<string>;
        locations: Set<string>;
        yearRange: [number, number];
    }) => void;
}

export function ArchiveSidebar({
    locations = [],
    facets = [],
    minYear,
    maxYear,
    onFilterChange,
}: ArchiveSidebarProps) {
    const t = useTranslations("Sidebar");
    const locale = useLocale();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
    const [checkedCategories, setCheckedCategories] = useState<Set<string>>(
        new Set(["productions"])
    );
    const [checkedLocations, setCheckedLocations] = useState<Set<string>>(new Set());

    const validatedMinYear = Math.min(minYear, maxYear);
    const validatedMaxYear = Math.max(minYear, maxYear);

    const [yearRange, setYearRange] = useState<[number, number]>([
        validatedMinYear,
        validatedMaxYear,
    ]);

    useEffect(() => {
        onFilterChange?.({
            categories: checkedCategories,
            tags: activeTags,
            locations: checkedLocations,
            yearRange,
        });
    }, [checkedCategories, activeTags, checkedLocations, yearRange, onFilterChange]);

    const toggleTag = useCallback((tag: string) => {
        setActiveTags((prev) => {
            const next = new Set(prev);
            if (next.has(tag)) next.delete(tag);
            else next.add(tag);
            return next;
        });
    }, []);

    const toggleCategory = useCallback((cat: string) => {
        setCheckedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });
    }, []);

    const toggleLocation = useCallback((locId: string) => {
        setCheckedLocations((prev) => {
            const next = new Set(prev);
            if (next.has(locId)) next.delete(locId);
            else next.add(locId);
            return next;
        });
    }, []);

    const clearAll = useCallback(() => {
        setActiveTags(new Set());
        setCheckedCategories(new Set());
        setCheckedLocations(new Set());
        setYearRange([validatedMinYear, validatedMaxYear]);
    }, [validatedMinYear, validatedMaxYear]);

    const sidebarContent = (
        <>
            <div className="mb-1 flex items-center justify-between px-4 py-3">
                <div>
                    <h2 className="font-display text-2xl leading-relaxed font-medium">
                        {t("title")}
                    </h2>
                    <div className="bg-foreground mt-1 h-0.5 w-10" />
                </div>
                <button
                    onClick={() => setMobileOpen(false)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer p-1 lg:hidden"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            <FilterGroup label={t("categories.label")}>
                <div className="flex flex-wrap gap-2 pb-2.5">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            type="button"
                            aria-pressed={checkedCategories.has(cat)}
                            onClick={() => toggleCategory(cat)}
                            className={`cursor-pointer border px-2 py-1 font-mono text-[10px] tracking-[1.1px] whitespace-nowrap uppercase transition-all ${
                                checkedCategories.has(cat)
                                    ? "bg-foreground text-background border-foreground"
                                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                            }`}
                        >
                            {t(`categories.${cat}`)}
                        </button>
                    ))}
                </div>
            </FilterGroup>

            {facets.map((facet) => (
                <FilterGroup key={facet.slug} label={getLabel(facet.translations, locale)}>
                    <div className="flex flex-wrap gap-2 pb-2.5">
                        {facet.tags.map((tag) => (
                            <button
                                key={tag.slug}
                                type="button"
                                aria-pressed={activeTags.has(tag.slug)}
                                onClick={() => toggleTag(tag.slug)}
                                className={`cursor-pointer border px-2 py-1 font-mono text-[10px] tracking-[1.1px] whitespace-nowrap uppercase transition-all ${
                                    activeTags.has(tag.slug)
                                        ? "bg-foreground text-background border-foreground"
                                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                                }`}
                            >
                                {getLabel(tag.translations, locale)}
                            </button>
                        ))}
                    </div>
                </FilterGroup>
            ))}

            <FilterGroup label={t("locations.label")}>
                <div className="flex flex-wrap gap-2 pb-2.5">
                    {locations.length > 0 ? (
                        locations.map((loc) => (
                            <button
                                key={loc.id}
                                type="button"
                                aria-pressed={checkedLocations.has(loc.id)}
                                onClick={() => toggleLocation(loc.id)}
                                className={`cursor-pointer border px-2 py-1 font-mono text-[10px] tracking-[1.1px] whitespace-nowrap uppercase transition-all ${
                                    checkedLocations.has(loc.id)
                                        ? "bg-foreground text-background border-foreground"
                                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                                }`}
                            >
                                {loc.name ?? loc.address}
                            </button>
                        ))
                    ) : (
                        <button
                            type="button"
                            aria-pressed={checkedLocations.has("deVooruit")}
                            onClick={() => toggleLocation("deVooruit")}
                            className={`cursor-pointer border px-2 py-1 font-mono text-[10px] tracking-[1.1px] whitespace-nowrap uppercase transition-all ${
                                checkedLocations.has("deVooruit")
                                    ? "bg-foreground text-background border-foreground"
                                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                            }`}
                        >
                            De Vooruit
                        </button>
                    )}
                </div>
            </FilterGroup>

            <FilterGroup label={t("year.label")}>
                <div className="flex flex-col gap-3.5 pb-2.5">
                    <div className="text-foreground flex justify-between font-mono text-[13px] select-text">
                        <span>{yearRange[0]}</span>
                        <span className="text-muted-foreground text-[11px]">—</span>
                        <span>{yearRange[1]}</span>
                    </div>
                    <YearRangeSlider
                        min={validatedMinYear}
                        max={validatedMaxYear}
                        value={yearRange}
                        onChange={setYearRange}
                    />
                </div>
            </FilterGroup>

            <button
                onClick={clearAll}
                className="border-foreground text-foreground hover:bg-foreground hover:text-background mx-auto mt-4 block w-[calc(100%-40px)] max-w-[230px] cursor-pointer border bg-transparent px-4 py-[9px] font-mono text-[10px] font-medium tracking-[1.4px] uppercase transition-all"
            >
                {t("clearAll")}
            </button>
        </>
    );

    return (
        <>
            {/* Mobile filter toggle */}
            <button
                onClick={() => setMobileOpen(true)}
                className="border-border text-muted-foreground hover:text-foreground bg-background fixed bottom-4 left-4 z-40 flex cursor-pointer items-center gap-2 border px-4 py-2.5 font-mono text-[10px] tracking-[1.4px] uppercase shadow-lg transition-colors lg:hidden"
            >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {t("title")}
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/30 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`border-border shrink-0 border-r py-5 pb-10 ${
                    mobileOpen
                        ? "bg-background fixed inset-y-0 left-0 z-50 w-[290px] shadow-xl"
                        : "hidden lg:block lg:w-[290px]"
                }`}
            >
                {sidebarContent}
            </aside>
        </>
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

function YearRangeSlider({
    min,
    max,
    value,
    onChange,
}: {
    min: number;
    max: number;
    value: [number, number];
    onChange: (v: [number, number]) => void;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const drag = useRef<{ thumb: "lo" | "hi" | null; startX: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const frac = (v: number) => ((v - min) / (max - min)) * 100;

    const toValue = (clientX: number) => {
        if (!containerRef.current) return min;
        const { left, width } = containerRef.current.getBoundingClientRect();
        return Math.round(min + Math.max(0, Math.min(1, (clientX - left) / width)) * (max - min));
    };

    const onOverlayPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { thumb: null, startX: e.clientX };
        setIsDragging(true);
    };

    const onOverlayPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!drag.current || !e.buttons) return;
        if (drag.current.thumb === null) {
            const dx = e.clientX - drag.current.startX;
            if (Math.abs(dx) < 3) return;
            drag.current.thumb = dx < 0 ? "lo" : "hi";
        }
        const v = toValue(e.clientX);
        if (drag.current.thumb === "lo") {
            onChange([Math.max(min, Math.min(v, value[1])), value[1]]);
        } else {
            onChange([value[0], Math.min(max, Math.max(v, value[0]))]);
        }
    };

    const onOverlayPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        drag.current = null;
        setIsDragging(false);
    };

    const merged = value[0] === value[1];
    const overlayActive = merged || isDragging;

    const thumbCls =
        "absolute w-full -top-[6px] h-[14px] appearance-none bg-transparent pointer-events-none " +
        "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none " +
        "[&::-webkit-slider-thumb]:w-[14px] [&::-webkit-slider-thumb]:h-[14px] " +
        "[&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:border-2 " +
        "[&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:cursor-pointer " +
        "[&::-moz-range-thumb]:w-[14px] [&::-moz-range-thumb]:h-[14px] " +
        "[&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:border-2 " +
        "[&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:cursor-pointer " +
        "[&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:appearance-none";

    return (
        <div ref={containerRef} className="relative pt-1">
            <div className="bg-border relative h-0.5">
                <div
                    className="bg-foreground absolute h-full"
                    style={{
                        left: `${frac(value[0])}%`,
                        right: `${100 - frac(value[1])}%`,
                    }}
                />
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value[0]}
                onChange={(e) => {
                    const lo = Math.min(parseInt(e.target.value), value[1]);
                    onChange([lo, value[1]]);
                }}
                className={thumbCls}
            />
            <input
                type="range"
                min={min}
                max={max}
                value={value[1]}
                onChange={(e) => {
                    const hi = Math.max(parseInt(e.target.value), value[0]);
                    onChange([value[0], hi]);
                }}
                className={thumbCls}
            />
            {/* Overlay: active when merged so drag direction determines which thumb moves */}
            <div
                className={`absolute inset-x-0 -top-[6px] h-[14px] cursor-pointer ${overlayActive ? "" : "pointer-events-none"}`}
                onPointerDown={onOverlayPointerDown}
                onPointerMove={onOverlayPointerMove}
                onPointerUp={onOverlayPointerUp}
            />
        </div>
    );
}
