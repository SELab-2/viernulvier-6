"use client";

import { useRef, useState, type PointerEvent } from "react";

export interface ScrollPositionSliderProps {
    months: string[];
    currentIndex: number;
    onNavigate: (monthIndex: number) => void;
    onDragChange?: (isDragging: boolean) => void;
}

export function ScrollPositionSlider({
    months,
    currentIndex,
    onNavigate,
    onDragChange,
}: ScrollPositionSliderProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const drag = useRef<{ startY: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragIndex, setDragIndex] = useState(currentIndex);

    if (months.length === 0) return null;

    const frac = (index: number) => {
        if (months.length <= 1) return 0;
        return (index / (months.length - 1)) * 100;
    };

    const yearRanges: Array<{
        year: string;
        startIndex: number;
        endIndex: number;
    }> = [];

    let currentYear = "";
    let startIdx = 0;

    months.forEach((month, idx) => {
        const year = month.split(" ").pop() || "";
        if (year !== currentYear) {
            if (currentYear) {
                yearRanges.push({
                    year: currentYear,
                    startIndex: startIdx,
                    endIndex: idx - 1,
                });
            }
            currentYear = year;
            startIdx = idx;
        }
    });

    if (currentYear) {
        yearRanges.push({
            year: currentYear,
            startIndex: startIdx,
            endIndex: months.length - 1,
        });
    }

    const SLIDER_HEIGHT_PX = 320;
    const MIN_GAP_PX = 20;

    const filteredYearRanges = yearRanges.filter((range, index) => {
        if (index === 0) return true;
        if (index === yearRanges.length - 1) return true;

        const prev = yearRanges[index - 1];
        const prevTopPx = (frac(prev.startIndex) / 100) * SLIDER_HEIGHT_PX;
        const currentTopPx = (frac(range.startIndex) / 100) * SLIDER_HEIGHT_PX;

        return currentTopPx - prevTopPx >= MIN_GAP_PX;
    });

    const toIndex = (clientY: number) => {
        if (!containerRef.current) return 0;
        const { top, height } = containerRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientY - top) / height));
        return Math.round(ratio * (months.length - 1));
    };

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { startY: e.clientY };
        setIsDragging(true);
        onDragChange?.(true);

        const newIndex = toIndex(e.clientY);
        setDragIndex(newIndex);
    };

    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        if (!drag.current || !e.buttons) return;
        const newIndex = toIndex(e.clientY);
        setDragIndex(newIndex);
    };

    const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        drag.current = null;
        onNavigate(dragIndex);
        setIsDragging(false);
        onDragChange?.(false);
    };

    return (
        <div
            ref={containerRef}
            className="fixed top-1/2 left-4 z-40 h-[50vh] w-0.5 -translate-y-1/2 select-none"
        >
            <div className="bg-border relative h-full w-full">
                <div
                    className="bg-foreground absolute w-full transition-all"
                    style={{
                        top: 0,
                        bottom: `${100 - frac(isDragging ? dragIndex : currentIndex)}%`,
                    }}
                />

                {yearRanges.map((range) => (
                    <div key={`tick-${range.year}`}>
                        <div
                            className="bg-muted-foreground absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-full"
                            style={{
                                top: `${frac(range.startIndex)}%`,
                            }}
                        />
                    </div>
                ))}

                {filteredYearRanges.map((range) => (
                    <div key={`label-${range.year}`}>
                        <div
                            className="text-muted-foreground pointer-events-none absolute font-mono text-[10px] whitespace-nowrap"
                            style={{
                                top: `${frac(range.startIndex)}%`,
                                transform: "translateY(-50%)",
                                left: "12px",
                            }}
                        >
                            {range.year}
                        </div>
                    </div>
                ))}
            </div>

            <div
                className="bg-foreground border-background pointer-events-none absolute left-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 border-2"
                style={{
                    top: `${frac(isDragging ? dragIndex : currentIndex)}%`,
                }}
            />

            <div
                className="absolute inset-y-0 left-1/2 w-6 -translate-x-1/2 cursor-pointer"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
            />

            {isDragging && (
                <div
                    className="bg-background border-foreground absolute left-6 -translate-y-1/2 border-2 px-2 py-1 text-[12px] font-bold whitespace-nowrap"
                    style={{
                        top: `${frac(dragIndex)}%`,
                    }}
                >
                    {months[dragIndex]}
                </div>
            )}
        </div>
    );
}
