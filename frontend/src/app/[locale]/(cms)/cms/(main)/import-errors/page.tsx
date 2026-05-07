"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { PageHeader } from "@/components/cms/PageHeader";
import { ImportErrorsTable } from "../../tables/import-errors/import-errors-table";

export default function ImportErrorsPage() {
    const t = useTranslations("Cms.ImportErrors");
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
        <div className="flex h-full flex-col px-4 py-3">
            <PageHeader eyebrow={tEditions("edition6")} title={t("title")} />

            <div ref={contentRef} className="flex-1 space-y-6 overflow-auto">
                <ImportErrorsTable />
            </div>
        </div>
    );
}
