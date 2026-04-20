"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useImportRows, useImportSession } from "@/hooks/api/useImport";
import type { ImportRow } from "@/types/models/import.types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DryRunSummary } from "./DryRunSummary";
import { DryRunTable } from "./DryRunTable";

type DryRunStageProps = {
    sessionId: string;
};

export function DryRunStage({ sessionId }: DryRunStageProps) {
    const t = useTranslations("Cms.Import");
    const [selected, setSelected] = useState<ImportRow | null>(null);

    const {
        data: session,
        isPending: sessionLoading,
        isError: sessionError,
    } = useImportSession(sessionId);

    const { data: rows, isPending: rowsLoading, isError: rowsError } = useImportRows(sessionId);

    if (sessionLoading || rowsLoading) {
        return (
            <div className="mx-auto max-w-4xl space-y-6 pt-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        );
    }

    if (sessionError) {
        return (
            <p role="alert" className="text-destructive pt-4 text-sm">
                {t("errors.sessionLoadFailed")}
            </p>
        );
    }

    if (rowsError) {
        return (
            <p role="alert" className="text-destructive pt-4 text-sm">
                {t("errors.rowsLoadFailed")}
            </p>
        );
    }

    if (!session) {
        return null;
    }

    const resolvedRows = rows ?? [];

    return (
        <div className="mx-auto max-w-4xl space-y-6 pt-4">
            <DryRunSummary rows={resolvedRows} sessionStatus={session.status} />
            <DryRunTable rows={resolvedRows} onSelectRow={setSelected} />
            <div className="flex items-center gap-3">
                <Button disabled variant="outline">
                    {t("actions.rerunDryRun")}
                </Button>
                <Button disabled>{t("actions.commit")}</Button>
            </div>
            {selected !== null && (
                <div role="dialog" aria-modal="true">
                    <p>Row #{selected.rowNumber} drawer placeholder</p>
                    <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                        Close
                    </Button>
                </div>
            )}
        </div>
    );
}
