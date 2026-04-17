"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { CmsMobileMenu } from "./cms-sidebar";

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
            className="border-foreground/10 bg-background relative z-20 mb-0 shrink-0 border-b pb-1 opacity-0 lg:mb-2 lg:pb-2"
        >
            {/* Mobile: compact row with menu + title */}
            <div className="flex items-center gap-3 lg:hidden">
                <CmsMobileMenu />
                <div className="min-w-0 flex-1">
                    <div className="text-muted-foreground truncate font-mono text-[8px] tracking-[1.5px] uppercase">
                        {eyebrow}
                    </div>
                    <h1 className="font-display text-foreground truncate text-xl leading-none font-black tracking-tight uppercase">
                        {title}
                    </h1>
                </div>
            </div>

            {/* Desktop: full stacked header */}
            <div className="hidden lg:block">
                <div className="text-muted-foreground mb-1 font-mono text-[9px] tracking-[2px] uppercase">
                    {eyebrow}
                </div>
                <h1 className="font-display text-foreground text-[32px] leading-none font-black tracking-tight uppercase">
                    {title}
                </h1>
            </div>
        </header>
    );
}
