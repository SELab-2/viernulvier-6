"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";

interface DateRangePickerProps {
    startDate: Date;
    endDate: Date;
    minDate: Date;
    maxDate: Date;
    onChange: (start: Date, end: Date) => void;
}

type View = "year" | "month" | "day";
type Picking = "start" | "end";

const MONTHS_SHORT = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];
const MONTHS_LONG = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function formatDate(d: Date) {
    return `${d.getDate().toString().padStart(2, "0")} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstWeekday(year: number, month: number) {
    const d = new Date(year, month, 1).getDay();
    return d === 0 ? 6 : d - 1;
}

function sameDay(a: Date, b: Date) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

export function DateRangePicker({
    startDate,
    endDate,
    minDate,
    maxDate,
    onChange,
}: DateRangePickerProps) {
    const minYear = minDate.getFullYear();
    const maxYear = maxDate.getFullYear();

    const [open, setOpen] = useState(false);
    const [picking, setPicking] = useState<Picking>("start");
    const [view, setView] = useState<View>("year");
    const [browseYear, setBrowseYear] = useState(startDate.getFullYear());
    const [browseMonth, setBrowseMonth] = useState(startDate.getMonth());
    const containerRef = useRef<HTMLDivElement>(null);
    const yearScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    useEffect(() => {
        if (!open || view !== "year" || !yearScrollRef.current) return;
        const selected = yearScrollRef.current.querySelector(
            "[data-selected=true]"
        ) as HTMLElement | null;
        selected?.scrollIntoView({ block: "center", behavior: "instant" });
    }, [open, view]);

    const openPicker = (which: Picking) => {
        const anchor = which === "start" ? startDate : endDate;
        setPicking(which);
        setView("year");
        setBrowseYear(anchor.getFullYear());
        setBrowseMonth(anchor.getMonth());
        setOpen(true);
    };

    const goBack = () => {
        if (view === "day") setView("month");
        else if (view === "month") setView("year");
    };

    const selectYear = (year: number) => {
        setBrowseYear(year);
        setView("month");
    };
    const selectMonth = (month: number) => {
        setBrowseMonth(month);
        setView("day");
    };

    const selectDay = (day: number) => {
        const selected = new Date(browseYear, browseMonth, day);
        if (picking === "start") {
            const newEnd = selected > endDate ? selected : endDate;
            onChange(selected, newEnd);
            if (selected > endDate) {
                setPicking("end");
                setBrowseYear(selected.getFullYear());
                setBrowseMonth(selected.getMonth());
                setView("year");
            } else {
                setOpen(false);
            }
        } else {
            onChange(startDate, selected);
            setOpen(false);
        }
    };

    const activeYear = picking === "start" ? startDate.getFullYear() : endDate.getFullYear();
    const activeMonth = picking === "start" ? startDate.getMonth() : endDate.getMonth();

    const isYearDisabled = (y: number) => picking === "end" && y < startDate.getFullYear();

    const isMonthDisabled = (m: number) => {
        if (picking !== "end") return false;
        const monthEnd = new Date(browseYear, m + 1, 0);
        return (
            monthEnd < new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
        );
    };

    const isDayDisabled = (day: number) => {
        const d = new Date(browseYear, browseMonth, day);
        if (d < minDate || d > maxDate) return true;
        if (picking === "end") {
            return d < new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        }
        return false;
    };

    const isDayInRange = (day: number) => {
        const d = new Date(browseYear, browseMonth, day);
        const s = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const e = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        return d >= s && d <= e;
    };

    const panelHeader = () => {
        if (view === "year") return picking === "start" ? "Start year" : "End year";
        if (view === "month") return String(browseYear);
        return `${MONTHS_LONG[browseMonth]} ${browseYear}`;
    };

    const years: number[] = [];
    for (let y = minYear; y <= maxYear; y++) years.push(y);

    return (
        <div ref={containerRef} className="relative">
            {/* Date buttons */}
            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => openPicker("start")}
                    className={`flex-1 cursor-pointer border px-2 py-1.5 text-center font-mono text-[11px] tracking-wide transition-colors ${
                        open && picking === "start"
                            ? "border-foreground bg-foreground text-background"
                            : "border-border text-foreground hover:border-foreground"
                    }`}
                >
                    {formatDate(startDate)}
                </button>
                <span className="text-muted-foreground shrink-0 text-[10px]">—</span>
                <button
                    onClick={() => openPicker("end")}
                    className={`flex-1 cursor-pointer border px-2 py-1.5 text-center font-mono text-[11px] tracking-wide transition-colors ${
                        open && picking === "end"
                            ? "border-foreground bg-foreground text-background"
                            : "border-border text-foreground hover:border-foreground"
                    }`}
                >
                    {formatDate(endDate)}
                </button>
            </div>

            {/* Picker panel */}
            {open && (
                <div className="bg-background border-border absolute top-full right-0 left-0 z-50 mt-1 border shadow-lg">
                    {/* Header */}
                    <div className="border-border flex items-center gap-2 border-b px-3 py-2">
                        <button
                            onClick={goBack}
                            className={`text-muted-foreground hover:text-foreground cursor-pointer transition-colors ${view === "year" ? "pointer-events-none invisible" : ""}`}
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-foreground flex-1 text-center font-mono text-[10px] font-medium tracking-[1.2px] uppercase">
                            {panelHeader()}
                        </span>
                        <div className="h-3.5 w-3.5" />
                    </div>

                    {/* Year grid */}
                    {view === "year" && (
                        <div ref={yearScrollRef} className="max-h-[168px] overflow-y-auto p-1.5">
                            <div className="grid grid-cols-4 gap-0.5">
                                {years.map((y) => {
                                    const disabled = isYearDisabled(y);
                                    const selected = y === activeYear;
                                    return (
                                        <button
                                            key={y}
                                            data-selected={selected}
                                            onClick={() => !disabled && selectYear(y)}
                                            disabled={disabled}
                                            className={`cursor-pointer py-1.5 font-mono text-[11px] transition-colors ${
                                                disabled
                                                    ? "text-muted-foreground cursor-not-allowed opacity-30"
                                                    : selected
                                                      ? "bg-foreground text-background"
                                                      : "text-foreground hover:bg-foreground/10"
                                            }`}
                                        >
                                            {y}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Month grid */}
                    {view === "month" && (
                        <div className="grid grid-cols-3 gap-0.5 p-1.5">
                            {MONTHS_SHORT.map((m, i) => {
                                const disabled = isMonthDisabled(i);
                                const selected = i === activeMonth && browseYear === activeYear;
                                return (
                                    <button
                                        key={m}
                                        onClick={() => !disabled && selectMonth(i)}
                                        disabled={disabled}
                                        className={`cursor-pointer py-2.5 font-mono text-[11px] transition-colors ${
                                            disabled
                                                ? "text-muted-foreground cursor-not-allowed opacity-30"
                                                : selected
                                                  ? "bg-foreground text-background"
                                                  : "text-foreground hover:bg-foreground/10"
                                        }`}
                                    >
                                        {m}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Day grid */}
                    {view === "day" && (
                        <div className="p-1.5">
                            <div className="mb-0.5 grid grid-cols-7">
                                {WEEKDAYS.map((d) => (
                                    <span
                                        key={d}
                                        className="text-muted-foreground py-1 text-center font-mono text-[9px] tracking-wide"
                                    >
                                        {d}
                                    </span>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-0.5">
                                {Array.from(
                                    { length: getFirstWeekday(browseYear, browseMonth) },
                                    (_, i) => (
                                        <div key={`pad-${i}`} />
                                    )
                                )}
                                {Array.from(
                                    { length: getDaysInMonth(browseYear, browseMonth) },
                                    (_, i) => {
                                        const day = i + 1;
                                        const date = new Date(browseYear, browseMonth, day);
                                        const disabled = isDayDisabled(day);
                                        const inRange = isDayInRange(day);
                                        const isStartDay = sameDay(date, startDate);
                                        const isEndDay = sameDay(date, endDate);
                                        const isActive =
                                            picking === "start" ? isStartDay : isEndDay;
                                        const isOtherAnchor =
                                            picking === "start" ? isEndDay : isStartDay;

                                        return (
                                            <button
                                                key={day}
                                                onClick={() => !disabled && selectDay(day)}
                                                disabled={disabled}
                                                className={`flex aspect-square cursor-pointer items-center justify-center font-mono text-[11px] transition-colors ${
                                                    disabled
                                                        ? "text-muted-foreground cursor-not-allowed opacity-25"
                                                        : isActive
                                                          ? "bg-foreground text-background"
                                                          : isOtherAnchor
                                                            ? "bg-foreground/40 text-foreground"
                                                            : inRange
                                                              ? "bg-foreground/15 text-foreground"
                                                              : "text-foreground hover:bg-foreground/10"
                                                }`}
                                            >
                                                {day}
                                            </button>
                                        );
                                    }
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
