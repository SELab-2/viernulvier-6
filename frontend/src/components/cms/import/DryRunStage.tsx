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
            <div
                role="alert"
                className="border-destructive/40 bg-destructive/10 text-destructive mt-4 rounded-md border px-4 py-3 text-sm"
            >
                <p className="font-medium">{t("errors.sessionLoadFailed")}</p>
            </div>
        );
    }

    if (rowsError) {
        return (
            <div
                role="alert"
                className="border-destructive/40 bg-destructive/10 text-destructive mt-4 rounded-md border px-4 py-3 text-sm"
            >
                <p className="font-medium">{t("errors.rowsLoadFailed")}</p>
            </div>
        );
    }

    if (fieldsError) {
        return (
            <div
                role="alert"
                className="border-destructive/40 bg-destructive/10 text-destructive mt-4 rounded-md border px-4 py-3 text-sm"
            >
                <p className="font-medium">{t("errors.fieldsLoadFailed")}</p>
            </div>
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
            <div>
                <h2 className="font-display text-foreground text-lg font-bold tracking-tight">
                    {t("stepper.dryRun")}
                </h2>
                <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                    {t("dryRun.helperText")}
                </p>
            </div>

            <DryRunSummary rows={resolvedRows} sessionStatus={session.status} />
            <DryRunTable rows={resolvedRows} onSelectRow={(row) => setSelectedId(row.id)} />

            <div className="flex flex-col gap-3 pt-2">
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
