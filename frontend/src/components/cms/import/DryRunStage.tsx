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
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import type { ImportRowStatus } from "@/types/models/import.types";
import { DryRunSummary } from "./DryRunSummary";
import { DryRunTable } from "./DryRunTable";
import { RowDrawer } from "./RowDrawer";

type DryRunStageProps = {
    sessionId: string;
};

export function DryRunStage({ sessionId }: DryRunStageProps) {
    const t = useTranslations("Cms.Import");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<ImportRowStatus | "all">("all");
    const [commitConfirmOpen, setCommitConfirmOpen] = useState(false);
    const [userHasFiltered, setUserHasFiltered] = useState(false);

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

    const resolvedRows = rows ?? [];
    const resolvedFields = fields ?? [];
    const hasErrors = resolvedRows.some((r) => r.status === "error");

    // Auto-show error rows when dry run finishes with errors, unless the user has manually chosen a filter
    const effectiveFilter: ImportRowStatus | "all" =
        !userHasFiltered && session?.status === "dry_run_ready" && hasErrors
            ? "error"
            : statusFilter;

    const filteredRows =
        effectiveFilter === "all"
            ? resolvedRows
            : resolvedRows.filter((r) => r.status === effectiveFilter);

    const counts = {
        all: resolvedRows.length,
        will_create: resolvedRows.filter((r) => r.status === "will_create").length,
        will_update: resolvedRows.filter((r) => r.status === "will_update").length,
        will_skip: resolvedRows.filter((r) => r.status === "will_skip").length,
        error: resolvedRows.filter((r) => r.status === "error").length,
    };

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

    const selectedRow = selectedId ? (resolvedRows.find((r) => r.id === selectedId) ?? null) : null;
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

            {/* Status filter bar */}
            <div className="flex flex-wrap gap-2">
                {(
                    [
                        ["all", t("filter.all"), counts.all],
                        ["will_create", t("filter.willCreate"), counts.will_create],
                        ["will_update", t("filter.willUpdate"), counts.will_update],
                        ["will_skip", t("filter.willSkip"), counts.will_skip],
                        ["error", t("filter.errors"), counts.error],
                    ] as [ImportRowStatus | "all", string, number][]
                ).map(([key, label, count]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => {
                            setUserHasFiltered(true);
                            setStatusFilter(key);
                        }}
                        className={[
                            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                            effectiveFilter === key
                                ? "bg-foreground text-background border-foreground"
                                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                        ].join(" ")}
                    >
                        {label} <span className="tabular-nums">{count}</span>
                    </button>
                ))}
            </div>

            {filteredRows.length === 0 && effectiveFilter !== "all" ? (
                <div className="border-border rounded-md border px-6 py-12 text-center">
                    <p className="text-muted-foreground text-sm">
                        {effectiveFilter === "error" ? t("filter.noErrors") : t("filter.noResults")}
                    </p>
                </div>
            ) : (
                <DryRunTable
                    rows={filteredRows}
                    mapping={session.mapping}
                    onSelectRow={(row) => setSelectedId(row.id)}
                />
            )}

            <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={`/cms/import?session=${sessionId}&stage=mapping`}>
                            {t("actions.backToMapping")}
                        </Link>
                    </Button>
                    <Button
                        variant="outline"
                        disabled={!canRerun || startDryRun.isPending}
                        onClick={() => startDryRun.mutate(sessionId)}
                    >
                        {t("actions.rerunDryRun")}
                    </Button>
                    <Button
                        disabled={!canCommit || commitImport.isPending}
                        onClick={() => setCommitConfirmOpen(true)}
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
                mapping={session.mapping}
                onClose={() => setSelectedId(null)}
            />

            <Dialog open={commitConfirmOpen} onOpenChange={setCommitConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("dryRun.commitConfirmTitle")}</DialogTitle>
                        <DialogDescription>
                            {t("dryRun.commitConfirmBody", {
                                create: counts.will_create,
                                update: counts.will_update,
                                skip: counts.will_skip,
                            })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCommitConfirmOpen(false)}>
                            {t("dryRun.commitConfirmCancel")}
                        </Button>
                        <Button
                            onClick={() => {
                                setCommitConfirmOpen(false);
                                commitImport.mutate(sessionId);
                            }}
                        >
                            {t("dryRun.commitConfirmCta")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
