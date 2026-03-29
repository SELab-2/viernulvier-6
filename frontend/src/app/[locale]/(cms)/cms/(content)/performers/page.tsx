"use client";

import { useTranslations } from "next-intl";
import { useUser } from "@/hooks/useAuth";
import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { PerformersTable } from "../../tables/performers/performers-table";

export default function PerformersPage() {
    const t = useTranslations("Cms.Performers");
    const { data: user } = useUser();
    const headerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (headerRef.current) {
            animate(headerRef.current, {
                opacity: [0, 1],
                translateY: [-8, 0],
                ease: "outQuad",
                duration: 500,
            });
        }
    }, []);

    const today = new Date().toLocaleDateString("nl-BE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    return (
        <div className="w-full max-w-[1400px]">
            {/* Editorial Header */}
            <header ref={headerRef} className="border-foreground/10 mb-8 border-b-2 pb-6 opacity-0">
                {/* Top Bar */}
                <div className="text-muted-foreground mb-4 flex items-center justify-between font-mono text-[9px] tracking-[2px] uppercase">
                    <div className="flex items-center gap-3">
                        <span>Ed. 04 — Uitgave D</span>
                        <span className="bg-border h-3 w-px" />
                        <span>Archive — Performers</span>
                    </div>
                    <span>{today}</span>
                </div>

                {/* Main Title */}
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="font-display text-foreground text-[42px] font-black tracking-tight uppercase">
                            {t("title")}
                        </h1>
                        <div className="bg-foreground mt-2 h-0.5 w-16" />
                    </div>
                </div>

                {/* Subtitle */}
                <p className="text-muted-foreground font-body mt-4 max-w-xl text-[14px] leading-relaxed italic">
                    {t("subtitle")}
                </p>

                {/* Dateline */}
                <div className="border-foreground/20 text-muted-foreground mt-5 flex items-center justify-between border-y py-1.5 font-mono text-[9px] tracking-[1.5px] uppercase">
                    <span>Artist Database</span>
                    <span className="text-foreground">{user?.role || "Editor"}</span>
                    <span>All Rights Reserved</span>
                </div>
            </header>

            {/* Table */}
            <PerformersTable />

            {/* Footer Quote */}
            <footer className="border-foreground/10 text-muted-foreground mt-12 border-t pt-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="font-body text-[13px] leading-relaxed italic">
                            &ldquo;Artists breathe life into every performance.&rdquo;
                        </p>
                        <div className="text-muted-foreground/60 mt-2 font-mono text-[8px] tracking-[1px] uppercase">
                            — Viernulvier Archive
                        </div>
                    </div>
                    <div className="text-right font-mono text-[9px] tracking-[1.4px] uppercase">
                        <div>VIERNULVIER ARCHIEF</div>
                        <div className="text-muted-foreground/60 mt-1">CMS v1.0</div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
