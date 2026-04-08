"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";

interface PageHeaderProps {
    eyebrow: string;
    title: string;
}

export function PageHeader({ eyebrow, title }: PageHeaderProps) {
    const headerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (headerRef.current) {
            headerRef.current.style.opacity = "0";
            headerRef.current.style.transform = "translateY(-10px)";
            animate(headerRef.current, {
                opacity: [0, 1],
                translateY: [-10, 0],
                ease: "outQuad",
                duration: 600,
            });
        }
    });

    return (
        <header
            ref={headerRef}
            className="border-foreground/10 bg-background relative z-20 mb-6 shrink-0 border-b pb-4 opacity-0"
        >
            <div className="text-muted-foreground mb-2 font-mono text-[9px] tracking-[2px] uppercase">
                {eyebrow}
            </div>
            <h1 className="font-display text-foreground text-[32px] font-black tracking-tight uppercase">
                {title}
            </h1>
        </header>
    );
}
