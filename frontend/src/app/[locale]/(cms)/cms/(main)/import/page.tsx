"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/cms/PageHeader";
import { ImportStepper, type ImportStage } from "@/components/cms/import/ImportStepper";
import { MappingStage } from "@/components/cms/import/MappingStage";
import { UploadStage } from "@/components/cms/import/UploadStage";
import { useImportSession } from "@/hooks/api/useImport";
import type { ImportSessionStatus } from "@/types/models/import.types";

function deriveStage(status: ImportSessionStatus | undefined): ImportStage {
    if (!status) {
        return "upload";
    }
    switch (status) {
        case "mapping":
            return "mapping";
        case "dry_run_pending":
        case "dry_run_ready":
            return "dry_run";
        case "committing":
        case "committed":
            return "commit";
        default:
            return "upload";
    }
}

export default function ImportPage() {
    const t = useTranslations("Cms.Import");
    const tEditions = useTranslations("Cms.editions");
    const contentRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();
    const sessionId = searchParams?.get("session") ?? "";

    const { data: session } = useImportSession(sessionId, { enabled: sessionId !== "" });

    const currentStage = sessionId === "" ? "upload" : deriveStage(session?.status);

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

            {/* Content - scrollable */}
            <div ref={contentRef} className="flex-1 overflow-auto">
                <ImportStepper currentStage={currentStage} />
                {currentStage === "upload" && <UploadStage />}
                {currentStage === "mapping" && sessionId !== "" && (
                    <MappingStage sessionId={sessionId} />
                )}
                {currentStage === "mapping" && sessionId === "" && <div />}
                {currentStage === "dry_run" && <div />}
                {currentStage === "commit" && <div />}
            </div>
        </div>
    );
}
