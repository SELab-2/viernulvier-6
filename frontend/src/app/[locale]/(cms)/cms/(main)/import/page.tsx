"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { useSearchParams } from "next/navigation";
import { History } from "lucide-react";
import { PageHeader } from "@/components/cms/PageHeader";
import { ImportStepper, type ImportStage } from "@/components/cms/import/ImportStepper";
import { CommitStage } from "@/components/cms/import/CommitStage";
import { DryRunStage } from "@/components/cms/import/DryRunStage";
import { MappingStage } from "@/components/cms/import/MappingStage";
import { UploadStage } from "@/components/cms/import/UploadStage";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
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
        case "failed":
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

    const {
        data: session,
        isPending: sessionLoading,
        isError: sessionError,
    } = useImportSession(sessionId, { enabled: sessionId !== "" });

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
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <ImportStepper currentStage={currentStage} />
                    </div>
                    {sessionId === "" && (
                        <div className="mt-1 ml-4 shrink-0">
                            <Button variant="ghost" size="sm" asChild>
                                <Link
                                    href="/cms/import/history"
                                    className="flex items-center gap-1.5 font-mono text-xs tracking-wide"
                                >
                                    <History className="h-3.5 w-3.5" />
                                    {t("viewHistory")}
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>

                {sessionId !== "" && sessionLoading && !sessionError && (
                    <div className="mx-auto max-w-3xl space-y-6 pt-4">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                )}
                {sessionId !== "" && sessionError && (
                    <p role="alert" className="text-destructive pt-4 text-sm">
                        {t("errors.sessionLoadFailed")}
                    </p>
                )}
                {(sessionId === "" || (!sessionLoading && !sessionError)) &&
                    currentStage === "upload" && <UploadStage />}
                {!sessionLoading &&
                    !sessionError &&
                    currentStage === "mapping" &&
                    sessionId !== "" && <MappingStage sessionId={sessionId} />}
                {!sessionLoading &&
                    !sessionError &&
                    currentStage === "mapping" &&
                    sessionId === "" && <div />}
                {!sessionLoading &&
                    !sessionError &&
                    currentStage === "dry_run" &&
                    sessionId !== "" && <DryRunStage sessionId={sessionId} />}
                {!sessionLoading &&
                    !sessionError &&
                    currentStage === "commit" &&
                    sessionId !== "" && <CommitStage sessionId={sessionId} />}
                {!sessionLoading &&
                    !sessionError &&
                    currentStage === "commit" &&
                    sessionId === "" && <div />}
            </div>
        </div>
    );
}
