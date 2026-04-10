"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { SlidersHorizontal, X } from "lucide-react";

import type { Location } from "@/types/models/location.types";
import type { Facet } from "@/types/models/taxonomy.types";
import { getLabel } from "@/lib/utils";

import { YearRangeSlider } from "./YearRangeSlider";
import { DateRangePicker } from "./DateRangePicker";

const CATEGORIES = ["artists", "productions", "articles", "posters"] as const;

type DateFilterMode = "year" | "exact";

interface ArchiveSidebarProps {
    locations?: Location[];
    facets?: Facet[];
    minYear?: number;
    maxYear?: number;
    onFilterChange?: (filters: {
        categories: Set<string>;
        tags: Set<string>;
        locations: Set<string>;
        dateRange: [Date, Date];
    }) => void;
}

export function ArchiveSidebar({
    locations = [],
    facets = [],
    minYear = 1980,
    maxYear = new Date().getFullYear(),
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

    const minDate = new Date(validatedMinYear, 0, 1);
    const maxDate = new Date(validatedMaxYear, 11, 31);

    const [dateMode, setDateMode] = useState<DateFilterMode>("year");
    const [yearRange, setYearRange] = useState<[number, number]>([
        validatedMinYear,
        validatedMaxYear,
    ]);
    const [dateRange, setDateRange] = useState<[Date, Date]>([minDate, maxDate]);

    const effectiveDateRange = useMemo<[Date, Date]>(
        () =>
            dateMode === "year"
                ? [new Date(yearRange[0], 0, 1), new Date(yearRange[1], 11, 31)]
                : dateRange,
        [dateMode, yearRange, dateRange]
    );

    const switchToExact = () => {
        setDateRange([new Date(yearRange[0], 0, 1), new Date(yearRange[1], 11, 31)]);
        setDateMode("exact");
    };

    const switchToYear = () => {
        setYearRange([dateRange[0].getFullYear(), dateRange[1].getFullYear()]);
        setDateMode("year");
    };

    useEffect(() => {
        if (!mobileOpen) return;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, [mobileOpen]);

    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!onFilterChange) return;
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
            onFilterChange({
                categories: checkedCategories,
                tags: activeTags,
                locations: checkedLocations,
                dateRange: effectiveDateRange,
            });
        }, 300);
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [checkedCategories, activeTags, checkedLocations, effectiveDateRange, onFilterChange]);

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
        setDateMode("year");
        setYearRange([validatedMinYear, validatedMaxYear]);
        setDateRange([new Date(validatedMinYear, 0, 1), new Date(validatedMaxYear, 11, 31)]);
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

            {/* Date filter — tabs replace the section title */}
            <div className="border-border border-t pt-2.5 pr-5 pb-3 pl-4">
                <div className="mb-3.5 flex gap-5">
                    <ModeTab
                        label={t("year.rangeMode")}
                        active={dateMode === "year"}
                        onClick={switchToYear}
                    />
                    <ModeTab
                        label={t("year.exactMode")}
                        active={dateMode === "exact"}
                        onClick={switchToExact}
                    />
                </div>

                {dateMode === "year" && (
                    <>
                        <div className="text-foreground mb-3.5 flex justify-between font-mono text-[13px] select-text">
                            <span>{yearRange[0]}</span>
                            <span className="text-muted-foreground text-[11px]">—</span>
                            <span>{yearRange[1]}</span>
                        </div>
                        <YearRangeSlider
                            min={validatedMinYear}
                            max={validatedMaxYear}
                            value={yearRange}
                            onChange={setYearRange}
                            ariaLabelStart={t("year.rangeFrom")}
                            ariaLabelEnd={t("year.rangeTo")}
                        />
                    </>
                )}

                {dateMode === "exact" && (
                    <div className="mt-5">
                        <DateRangePicker
                            startDate={dateRange[0]}
                            endDate={dateRange[1]}
                            minDate={minDate}
                            maxDate={maxDate}
                            onChange={(start, end) => setDateRange([start, end])}
                        />
                    </div>
                )}
            </div>

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
            <button
                onClick={() => setMobileOpen(true)}
                className="border-border text-muted-foreground hover:text-foreground bg-background fixed bottom-4 left-4 z-40 flex cursor-pointer items-center gap-2 border px-4 py-2.5 font-mono text-[10px] tracking-[1.4px] uppercase shadow-lg transition-colors lg:hidden"
            >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {t("title")}
            </button>

            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/30 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside
                className={`border-border shrink-0 border-r py-5 pb-10 ${
                    mobileOpen
                        ? "bg-background fixed inset-y-0 left-0 z-50 w-[290px] overflow-y-auto shadow-xl"
                        : "hidden lg:block lg:w-[290px]"
                }`}
            >
                {sidebarContent}
            </aside>
        </>
    );
}

function ModeTab({
    label,
    active,
    onClick,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`cursor-pointer border-b-2 pb-1 font-mono text-[11px] font-medium tracking-[1.2px] uppercase transition-all ${
                active
                    ? "border-foreground text-foreground"
                    : "text-muted-foreground hover:text-foreground border-transparent"
            }`}
        >
            {label}
        </button>
    );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="border-border border-t px-5 py-2.5 pl-4">
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
