"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { ProductionsTable } from "../../tables/productions/productions-table";

export default function ProductionsPage() {
    const t = useTranslations("Cms.Productions");
    const headerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (headerRef.current) {
            animate(headerRef.current, {
                opacity: [0, 1],
                translateY: [-10, 0],
                ease: "outQuad",
                duration: 600,
            });
        }
    }, []);

    return (
        <div className="flex h-full flex-col px-6 py-8">
            {/* Header */}
            <header
                ref={headerRef}
                className="border-foreground/10 bg-background relative z-20 mb-8 shrink-0 border-b-2 pb-6 opacity-0"
            >
                <div className="text-muted-foreground mb-3 font-mono text-[9px] tracking-[2px] uppercase">
                    Ed. 01 — Producties
                </div>
                <h1 className="font-display text-foreground text-[36px] font-black tracking-tight uppercase sm:text-[42px]">
                    {t("title")}
                </h1>
                <div className="bg-foreground mt-3 h-0.5 w-16" />
                <p className="text-muted-foreground font-body mt-4 max-w-xl text-sm leading-relaxed">
                    {t("subtitle")}
                </p>
            </header>

            {/* Table */}
            <div className="flex-1 overflow-y-auto">
                <ProductionsTable />
            </div>
        </div>
    );
}
