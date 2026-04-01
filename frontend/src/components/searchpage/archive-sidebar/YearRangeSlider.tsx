"use client";

import { useRef, useState, type PointerEvent } from "react";

export interface YearRangeSliderProps {
    min: number;
    max: number;
    value: [number, number];
    onChange: (v: [number, number]) => void;
    ariaLabelStart?: string;
    ariaLabelEnd?: string;
}

export function YearRangeSlider({
    min,
    max,
    value,
    onChange,
    ariaLabelStart,
    ariaLabelEnd,
}: YearRangeSliderProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const drag = useRef<{ thumb: "lo" | "hi" | null; startX: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const invalidRange = !Number.isFinite(min) || !Number.isFinite(max) || min >= max;

    const frac = (v: number) => {
        const range = max - min;
        if (range === 0 || !Number.isFinite(range)) return 0;
        return ((v - min) / range) * 100;
    };

    if (invalidRange) {
        console.error("YearRangeSlider: Invalid min/max props", { min, max });
        return <div>Error: Invalid year range</div>;
    }

    const toValue = (clientX: number) => {
        if (!containerRef.current) return min;
        const { left, width } = containerRef.current.getBoundingClientRect();
        return Math.round(min + Math.max(0, Math.min(1, (clientX - left) / width)) * (max - min));
    };

    const onOverlayPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { thumb: null, startX: e.clientX };
        setIsDragging(true);
    };

    const onOverlayPointerMove = (e: PointerEvent<HTMLDivElement>) => {
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

    const onOverlayPointerUp = (e: PointerEvent<HTMLDivElement>) => {
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
        <div ref={containerRef} className="relative pt-1 select-none">
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
                aria-label={ariaLabelStart}
                min={min}
                max={max}
                value={value[0]}
                onChange={(e) => {
                    const lo = Math.min(parseInt(e.target.value, 10), value[1]);
                    onChange([lo, value[1]]);
                }}
                className={thumbCls}
            />
            <input
                type="range"
                aria-label={ariaLabelEnd}
                min={min}
                max={max}
                value={value[1]}
                onChange={(e) => {
                    const hi = Math.max(parseInt(e.target.value, 10), value[0]);
                    onChange([value[0], hi]);
                }}
                className={thumbCls}
            />
            <div
                className={`absolute inset-x-0 -top-[6px] h-[14px] cursor-pointer ${overlayActive ? "" : "pointer-events-none"}`}
                onPointerDown={onOverlayPointerDown}
                onPointerMove={onOverlayPointerMove}
                onPointerUp={onOverlayPointerUp}
                onPointerCancel={onOverlayPointerUp}
            />
        </div>
    );
}
