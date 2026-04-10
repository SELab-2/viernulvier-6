"use client";

import { useEffect, useRef, useCallback } from "react";
import { animate, stagger } from "animejs";

// Professional easing curves
export const easing = {
    smooth: "outQuad",
    smoothOut: "outQuad",
    smoothIn: "inQuad",
    editorial: "outQuad",
} as const;

// Stagger animation for lists/tables
export function useStagger<T extends HTMLElement>(
    options: {
        delay?: number;
        staggerDelay?: number;
        duration?: number;
        translateY?: number;
        opacity?: [number, number];
    } = {}
) {
    const containerRef = useRef<T>(null);
    const hasAnimated = useRef(false);

    const {
        delay = 50,
        staggerDelay = 30,
        duration = 400,
        translateY = 8,
        opacity = [0, 1],
    } = options;

    useEffect(() => {
        if (!containerRef.current || hasAnimated.current) return;

        const children = containerRef.current.children;
        if (children.length === 0) return;

        hasAnimated.current = true;

        animate(children, {
            opacity,
            translateY: [translateY, 0],
            ease: "outQuad",
            duration,
            delay: stagger(staggerDelay, { start: delay }),
        });
    }, [delay, staggerDelay, duration, translateY, opacity]);

    return containerRef;
}

// Fade in animation for pages/sections
export function useFadeIn<T extends HTMLElement>(
    options: {
        delay?: number;
        duration?: number;
        translateY?: number;
    } = {}
) {
    const ref = useRef<T>(null);
    const hasAnimated = useRef(false);

    const { delay = 0, duration = 500, translateY = 12 } = options;

    useEffect(() => {
        if (!ref.current || hasAnimated.current) return;

        hasAnimated.current = true;

        animate(ref.current, {
            opacity: [0, 1],
            translateY: [translateY, 0],
            ease: "outQuad",
            duration,
            delay,
        });
    }, [delay, duration, translateY]);

    return ref;
}

// Smooth height animation
export function useSmoothHeight<T extends HTMLElement>() {
    const ref = useRef<T>(null);

    const animateHeight = useCallback((targetHeight: number | "auto") => {
        if (!ref.current) return;

        const element = ref.current;
        const currentHeight = element.offsetHeight;
        const endHeight = targetHeight === "auto" ? element.scrollHeight : targetHeight;

        animate(element, {
            height: [currentHeight, endHeight],
            ease: "outQuad",
            duration: 300,
        });
    }, []);

    return { ref, animateHeight };
}

// Hover scale animation helper
export function useHoverScale<T extends HTMLElement>(scale = 1.02) {
    const ref = useRef<T>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const handleEnter = () => {
            animate(element, {
                scale,
                ease: "outQuad",
                duration: 200,
            });
        };

        const handleLeave = () => {
            animate(element, {
                scale: 1,
                ease: "outQuad",
                duration: 200,
            });
        };

        element.addEventListener("mouseenter", handleEnter);
        element.addEventListener("mouseleave", handleLeave);

        return () => {
            element.removeEventListener("mouseenter", handleEnter);
            element.removeEventListener("mouseleave", handleLeave);
        };
    }, [scale]);

    return ref;
}

// Card hover effect with subtle lift
export function useCardHover<T extends HTMLElement>() {
    const ref = useRef<T>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const handleEnter = () => {
            animate(element, {
                translateY: -2,
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                ease: "outQuad",
                duration: 250,
            });
        };

        const handleLeave = () => {
            animate(element, {
                translateY: 0,
                boxShadow: "0 0 0 rgba(0,0,0,0)",
                ease: "outQuad",
                duration: 250,
            });
        };

        element.addEventListener("mouseenter", handleEnter);
        element.addEventListener("mouseleave", handleLeave);

        return () => {
            element.removeEventListener("mouseenter", handleEnter);
            element.removeEventListener("mouseleave", handleLeave);
        };
    }, []);

    return ref;
}
