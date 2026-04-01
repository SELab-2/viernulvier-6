"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { Database, Construction } from "lucide-react";

import { SectionCard, SectionCardContent } from "@/components/cms/SectionCard";

export default function IngestPage() {
    const t = useTranslations("Cms.Overview");
    const containerRef = useRef<HTMLDivElement>(null);
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

        if (containerRef.current) {
            const cards = containerRef.current.querySelectorAll("[data-card]");
            animate(cards, {
                opacity: [0, 1],
                translateY: [16, 0],
                ease: "outQuad",
                duration: 500,
            });
        }
    }, []);

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col px-4 py-6 sm:px-6 sm:py-8">
            {/* Header */}
            <header
                ref={headerRef}
                className="border-foreground/10 mx-auto mb-6 w-full max-w-7xl shrink-0 border-b-2 pb-6 text-center opacity-0 sm:mb-8"
            >
                <h1 className="font-display text-foreground mb-2 text-[36px] font-black tracking-tight uppercase sm:text-[42px] lg:text-[56px]">
                    {t("ingest")}
                </h1>
                <div className="bg-foreground mx-auto h-0.5 w-20 sm:w-24" />
            </header>

            {/* Main Content */}
            <div className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto">
                <div ref={containerRef} className="mx-auto max-w-xl p-4">
                    <SectionCard
                        href="/cms"
                        className="border-foreground/10 hover:border-foreground/30 group relative flex flex-col overflow-hidden border p-4 transition-colors duration-250 sm:p-5"
                    >
                        <div data-card className="opacity-0">
                            <SectionCardContent
                                edition="Ed. 05"
                                title={t("ingest")}
                                description={t("ingestDescription")}
                                actionLabel={t("backToOverview")}
                                icon={Construction}
                                comingSoon
                            />
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}
