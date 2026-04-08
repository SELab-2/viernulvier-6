"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { Construction } from "lucide-react";
import { PageHeader } from "@/components/cms/PageHeader";

export default function IngestPage() {
    const t = useTranslations("Cms.Ingest");
    const tHeader = useTranslations("Cms.PageHeader");
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
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
            <PageHeader eyebrow={tHeader("ingestEyebrow")} title={t("title")} />

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
