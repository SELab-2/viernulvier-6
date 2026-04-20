"use client";

import { useState, useEffect, useRef } from "react";
import { animate } from "animejs";

interface AnimatedNumberProps {
    value: number;
    duration?: number;
    className?: string;
}

export function AnimatedNumber({ value, duration = 1200, className }: AnimatedNumberProps) {
    const [display, setDisplay] = useState(0);
    const objRef = useRef({ value: 0 });
    const animRef = useRef<ReturnType<typeof animate> | null>(null);

    useEffect(() => {
        const startValue = objRef.current.value;

        if (animRef.current) {
            animRef.current.pause();
        }

        animRef.current = animate(objRef.current, {
            value: [startValue, value],
            duration,
            ease: "easeOutQuart",
            onUpdate: () => {
                setDisplay(Math.round(objRef.current.value));
            },
        });

        return () => {
            if (animRef.current) {
                animRef.current.pause();
            }
        };
    }, [value, duration]);

    return <span className={className}>{display.toLocaleString()}</span>;
}
