"use client";

import { useRef, useState, useLayoutEffect, type PointerEvent } from "react";

export type SliderItem = {
    label: string;
    type: "year" | "month";
};

export interface ScrollPositionSliderProps {
    sliderItems: SliderItem[];
    currentIndex: number;
    onNavigate: (index: number) => void;
    onDragChange?: (isDragging: boolean) => void;
}

export function ScrollPositionSlider({
    sliderItems,
    currentIndex,
    onNavigate,
    onDragChange,
}: ScrollPositionSliderProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragIndex, setDragIndex] = useState(currentIndex);
    const [sliderHeight, setSliderHeight] = useState(544);

    useLayoutEffect(() => {
        const updateHeight = () => {
            if (containerRef.current) {
                setSliderHeight(containerRef.current.getBoundingClientRect().height);
            }
        };

        updateHeight();
        window.addEventListener("resize", updateHeight);
        return () => window.removeEventListener("resize", updateHeight);
    }, []);

    if (sliderItems.length === 0) return null;

    const frac = (index: number) => {
        if (sliderItems.length <= 1) return 0;
        return (index / (sliderItems.length - 1)) * 100;
    };

    const yearIndices = sliderItems.reduce<number[]>((acc, item, index) => {
        if (item.type === "year") {
            acc.push(index);
        }
        return acc;
    }, []);

    const MIN_GAP_PX = 16;

    const filteredYearIndices = yearIndices.filter((index, i) => {
        if (i === 0) return true;
        if (i === yearIndices.length - 1) return true;

        const prevIndex = yearIndices[i - 1];
        const prevTopPx = (frac(prevIndex) / 100) * sliderHeight;
        const currentTopPx = (frac(index) / 100) * sliderHeight;

        return currentTopPx - prevTopPx >= MIN_GAP_PX;
    });

    const toIndex = (clientY: number) => {
        if (!containerRef.current) return 0;
        const { top, height } = containerRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientY - top) / height));
        return Math.round(ratio * (sliderItems.length - 1));
    };

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDragging(true);
        onDragChange?.(true);

        const newIndex = toIndex(e.clientY);
        setDragIndex(newIndex);
    };

    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        const newIndex = toIndex(e.clientY);
        setDragIndex(newIndex);
    };

    const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }

        const newIndex = toIndex(e.clientY);
        setDragIndex(newIndex);
        onNavigate(newIndex);
        setIsDragging(false);
        onDragChange?.(false);
    };

    const onPointerCancel = () => {
        setIsDragging(false);
        onDragChange?.(false);
    };

    return (
        <div ref={containerRef} className="relative z-40 h-full w-11 shrink-0 select-none sm:w-13">
            {filteredYearIndices.map((index) => (
                <div key={`label-${sliderItems[index].label}`}>
                    <div
                        className="text-muted-foreground pointer-events-none absolute right-2.5 left-0 text-right font-mono text-[11px] leading-none whitespace-nowrap"
                        style={{
                            top: `${frac(index)}%`,
                            transform: "translateY(-50%)",
                        }}
                    >
                        {sliderItems[index].label}
                    </div>
                </div>
            ))}

            <div className="absolute inset-y-0 right-0 w-0.5">
                <div className="bg-border relative h-full w-full">
                    <div
                        className="bg-foreground absolute w-full transition-all"
                        style={{
                            top: 0,
                            bottom: `${100 - frac(isDragging ? dragIndex : currentIndex)}%`,
                        }}
                    />

                    {yearIndices.map((index) => (
                        <div key={`tick-${sliderItems[index].label}`}>
                            <div
                                className="bg-muted-foreground absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-full"
                                style={{
                                    top: `${frac(index)}%`,
                                }}
                            />
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
                    onPointerCancel={onPointerCancel}
                />

                {isDragging && (
                    <div
                        className="bg-background border-foreground absolute left-full z-50 ml-2 -translate-y-1/2 border-2 px-2 py-1 text-[12px] font-bold whitespace-nowrap"
                        style={{
                            top: `${frac(dragIndex)}%`,
                        }}
                    >
                        {sliderItems[dragIndex]?.label}
                    </div>
                )}
            </div>
        </div>
    );
}
