"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { animate } from "animejs";

import { PageHeader } from "@/components/cms/PageHeader";
import { HistoryList } from "@/components/cms/import/HistoryList";

export default function ImportHistoryPage() {
    const t = useTranslations("Cms.Import.history");
    const tEditions = useTranslations("Cms.editions");
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
        <div className="flex h-full flex-col px-3 py-1 lg:px-4 lg:py-3">
            <PageHeader eyebrow={tEditions("edition6")} title={t("title")} />

            <div ref={contentRef} className="flex-1 overflow-auto">
                <HistoryList />
            </div>
        </div>
    );
}
