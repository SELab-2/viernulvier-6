"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import {
    useCommitImport,
    useFieldSpec,
    useImportRowStats,
    useImportRows,
    useImportSession,
    useSkipUpdateRows,
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

const PAGE_SIZE = 25;

export function DryRunStage({ sessionId }: DryRunStageProps) {
    const t = useTranslations("Cms.Import");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<ImportRowStatus | "all">("all");
    const [commitConfirmOpen, setCommitConfirmOpen] = useState(false);
    const [userHasFiltered, setUserHasFiltered] = useState(false);
    const [page, setPage] = useState(1);

    const {
        data: session,
        isPending: sessionLoading,
        isError: sessionError,
    } = useImportSession(sessionId);

    const {
        data: fields,
        isPending: fieldsLoading,
        isError: fieldsError,
    } = useFieldSpec(session?.entityType ?? "", { enabled: Boolean(session?.entityType) });

    const { data: rowStats, isPending: rowStatsLoading } = useImportRowStats(sessionId, {
        enabled: Boolean(session),
    });

    const hasErrors = (rowStats?.error ?? 0) > 0;

    // Auto-show error rows when dry run finishes with errors, unless the user has manually chosen a filter
    const effectiveFilter: ImportRowStatus | "all" =
        !userHasFiltered && session?.status === "dry_run_ready" && hasErrors
            ? "error"
            : statusFilter;

    const {
        data: rows,
        isPending: rowsLoading,
        isError: rowsError,
    } = useImportRows(
        sessionId,
        {
            page,
            limit: PAGE_SIZE,
            status: effectiveFilter === "all" ? null : effectiveFilter,
        },
        { enabled: Boolean(session) }
    );

    const startDryRun = useStartDryRun();
    const commitImport = useCommitImport();
    const skipUpdateRows = useSkipUpdateRows();

    const resolvedRows = rows ?? [];
    const resolvedFields = fields ?? [];

    const counts = {
        all: rowStats?.total ?? session?.rowCount ?? resolvedRows.length,
        will_create: rowStats?.willCreate ?? 0,
        will_update: rowStats?.willUpdate ?? 0,
        will_skip: rowStats?.willSkip ?? 0,
        error: rowStats?.error ?? 0,
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
    const canCommit = session.status === "dry_run_ready" && !rowStatsLoading && !hasErrors;
    const firstVisibleRow = resolvedRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const lastVisibleRow =
        resolvedRows.length === 0 ? 0 : firstVisibleRow + resolvedRows.length - 1;
    const canGoPrevious = page > 1;
    const canGoNext =
        effectiveFilter === "all" ? lastVisibleRow < counts.all : resolvedRows.length === PAGE_SIZE;

    return (
        <div className="mx-auto max-w-5xl space-y-5 pt-2">
            <div>
                <h2 className="font-display text-foreground text-lg font-bold tracking-tight">
                    {t("stepper.dryRun")}
                </h2>
                <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                    {t("dryRun.helperText")}
                </p>
            </div>

            <DryRunSummary rows={resolvedRows} stats={rowStats} sessionStatus={session.status} />

            <div className="border-border flex flex-col gap-4 border px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-foreground font-mono text-[10px] font-medium tracking-[1.5px] uppercase">
                        {t("dryRun.totalRows", { total: counts.all })}
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {t("dryRun.rowRange", {
                            start: firstVisibleRow,
                            end: lastVisibleRow,
                        })}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="rounded-none font-mono text-[10px] tracking-[1.5px] uppercase"
                    >
                        <Link href={`/cms/import?session=${sessionId}&stage=mapping`}>
                            {t("actions.backToMapping")}
                        </Link>
                    </Button>
                    <Button
                        variant="outline"
                        disabled={!canRerun || startDryRun.isPending}
                        onClick={() => startDryRun.mutate(sessionId)}
                        className="rounded-none font-mono text-[10px] tracking-[1.5px] uppercase"
                    >
                        {t("actions.rerunDryRun")}
                    </Button>
                    <Button
                        variant="outline"
                        disabled={
                            session.status !== "dry_run_ready" ||
                            counts.will_update === 0 ||
                            skipUpdateRows.isPending
                        }
                        onClick={() => skipUpdateRows.mutate(sessionId)}
                        className="rounded-none font-mono text-[10px] tracking-[1.5px] uppercase"
                    >
                        {t("actions.importWithoutOverriding")}
                    </Button>
                    <Button
                        disabled={!canCommit || commitImport.isPending}
                        onClick={() => setCommitConfirmOpen(true)}
                        className="rounded-none font-mono text-[10px] tracking-[1.5px] uppercase"
                    >
                        {t("actions.commit")}
                    </Button>
                </div>
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
            {skipUpdateRows.isError && (
                <p role="alert" className="text-destructive text-sm">
                    {t("errors.skipUpdatesFailed")}
                </p>
            )}

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
                            setPage(1);
                        }}
                        className={[
                            "border px-3 py-1 font-mono text-[10px] font-medium tracking-[1.5px] uppercase transition-colors",
                            effectiveFilter === key
                                ? "bg-foreground text-background border-foreground"
                                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                        ].join(" ")}
                    >
                        {label} <span className="tabular-nums">{count}</span>
                    </button>
                ))}
            </div>

            {resolvedRows.length === 0 && effectiveFilter !== "all" ? (
                <div className="border-border border px-6 py-12 text-center">
                    <p className="text-muted-foreground text-sm">
                        {effectiveFilter === "error" ? t("filter.noErrors") : t("filter.noResults")}
                    </p>
                </div>
            ) : (
                <DryRunTable
                    rows={resolvedRows}
                    mapping={session.mapping}
                    onSelectRow={(row) => setSelectedId(row.id)}
                />
            )}

            <div className="flex items-center justify-between gap-3">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!canGoPrevious}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="rounded-none font-mono text-[10px] tracking-[1.5px] uppercase"
                >
                    {t("actions.previousRows")}
                </Button>
                <span className="text-muted-foreground font-mono text-[10px] tracking-[1.5px] uppercase">
                    {t("dryRun.pageLabel", { page })}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!canGoNext}
                    onClick={() => setPage((current) => current + 1)}
                    className="rounded-none font-mono text-[10px] tracking-[1.5px] uppercase"
                >
                    {t("actions.nextRows")}
                </Button>
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
                        <Button
                            variant="outline"
                            onClick={() => setCommitConfirmOpen(false)}
                            className="rounded-none"
                        >
                            {t("dryRun.commitConfirmCancel")}
                        </Button>
                        <Button
                            onClick={() => {
                                setCommitConfirmOpen(false);
                                commitImport.mutate(sessionId);
                            }}
                            className="rounded-none"
                        >
                            {t("dryRun.commitConfirmCta")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
