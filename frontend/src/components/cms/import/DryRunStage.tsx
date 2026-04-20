"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import {
    useCommitImport,
    useFieldSpec,
    useImportRows,
    useImportSession,
    useStartDryRun,
} from "@/hooks/api/useImport";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DryRunSummary } from "./DryRunSummary";
import { DryRunTable } from "./DryRunTable";
import { RowDrawer } from "./RowDrawer";

type DryRunStageProps = {
    sessionId: string;
};

export function DryRunStage({ sessionId }: DryRunStageProps) {
    const t = useTranslations("Cms.Import");
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const {
        data: session,
        isPending: sessionLoading,
        isError: sessionError,
    } = useImportSession(sessionId);

    const { data: rows, isPending: rowsLoading, isError: rowsError } = useImportRows(sessionId);

    const {
        data: fields,
        isPending: fieldsLoading,
        isError: fieldsError,
    } = useFieldSpec(session?.entityType ?? "", { enabled: Boolean(session?.entityType) });

    const startDryRun = useStartDryRun();
    const commitImport = useCommitImport();

    if (sessionLoading || rowsLoading || fieldsLoading) {
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

    if (fieldsError) {
        return (
            <p role="alert" className="text-destructive pt-4 text-sm">
                {t("errors.fieldsLoadFailed")}
            </p>
        );
    }

    if (!session) {
        return null;
    }

    const resolvedRows = rows ?? [];
    const resolvedFields = fields ?? [];
    const selectedRow = selectedId ? (resolvedRows.find((r) => r.id === selectedId) ?? null) : null;

    const hasErrors = resolvedRows.some((r) => r.status === "error");
    const canRerun = session.status === "dry_run_ready" || session.status === "failed";
    const canCommit = session.status === "dry_run_ready" && !hasErrors;

    return (
        <div className="mx-auto max-w-4xl space-y-6 pt-4">
            <DryRunSummary rows={resolvedRows} sessionStatus={session.status} />
            <DryRunTable rows={resolvedRows} onSelectRow={(row) => setSelectedId(row.id)} />

            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        disabled={!canRerun || startDryRun.isPending}
                        onClick={() => startDryRun.mutate(sessionId)}
                    >
                        {t("actions.rerunDryRun")}
                    </Button>
                    <Button
                        disabled={!canCommit || commitImport.isPending}
                        onClick={() => commitImport.mutate(sessionId)}
                    >
                        {t("actions.commit")}
                    </Button>
                </div>

                {startDryRun.isError && (
                    <p role="alert" className="text-destructive text-sm">
                        {t("errors.rerunFailed")}
                    </p>
                )}
                {commitImport.isError && (
                    <p role="alert" className="text-destructive text-sm">
                        {t("errors.commitFailed")}
                    </p>
                )}
            </div>

            <RowDrawer
                row={selectedRow}
                sessionId={sessionId}
                fields={resolvedFields}
                onClose={() => setSelectedId(null)}
            />
        </div>
    );
}
