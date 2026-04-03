"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { Construction } from "lucide-react";

export default function IngestPage() {
    const t = useTranslations("Cms.Ingest");
    const headerRef = useRef<HTMLElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (headerRef.current) {
            animate(headerRef.current, {
                opacity: [0, 1],
                translateY: [-10, 0],
                ease: "outQuad",
                duration: 600,
            });
        }
        if (contentRef.current) {
            const el = contentRef.current;
            el.style.opacity = "0";
            el.style.transform = "translateY(16px)";
            animate(el, {
                opacity: [0, 1],
                translateY: [16, 0],
                ease: "outQuad",
                duration: 500,
                delay: 200,
            });
        }
    }, []);

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <header
                ref={headerRef}
                className="border-foreground/10 bg-background relative z-20 mb-8 shrink-0 border-b-2 pb-6 opacity-0"
            >
                <div className="text-muted-foreground mb-3 font-mono text-[9px] tracking-[2px] uppercase">
                    Ed. 05 — Import
                </div>
                <h1 className="font-display text-foreground text-[36px] font-black tracking-tight uppercase sm:text-[42px]">
                    {t("title")}
                </h1>
                <div className="bg-foreground mt-3 h-0.5 w-16" />
                <p className="text-muted-foreground font-body mt-4 max-w-xl text-sm leading-relaxed">
                    {t("subtitle")}
                </p>
            </header>

            {/* Content */}
            <div ref={contentRef} className="flex-1 overflow-y-auto">
                <div className="max-w-2xl">
                    <div className="border-foreground/20 bg-foreground/[0.02] border p-8">
                        <div className="flex items-start gap-4">
                            <div className="bg-foreground/5 flex h-12 w-12 shrink-0 items-center justify-center">
                                <Construction
                                    className="text-muted-foreground h-6 w-6"
                                    strokeWidth={1.5}
                                />
                            </div>
                            <div>
                                <div className="text-muted-foreground mb-2 font-mono text-[9px] tracking-[2px] uppercase">
                                    {t("comingSoon")}
                                </div>
                                <h2 className="font-display text-foreground mb-3 text-2xl font-bold tracking-tight">
                                    {t("notAvailable")}
                                </h2>
                                <p className="text-muted-foreground font-body text-sm leading-relaxed">
                                    {t("description")}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
