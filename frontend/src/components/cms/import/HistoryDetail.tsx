"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import { Link, useRouter } from "@/i18n/routing";
import {
    useDeleteImportSession,
    useImportRowStats,
    useImportSession,
    useImportRows,
    useRevertRow,
    useRollbackSession,
} from "@/hooks/api/useImport";
import type {
    ImportRow,
    ImportMapping,
    ImportRowStatus,
    ImportSession,
} from "@/types/models/import.types";
import { resolveRowLabel } from "@/lib/import/resolveRowLabel";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { statusBadgeClasses, statusLabelKey } from "./statusBadge";
import { SESSION_STATUS_CLASSES } from "./sessionStatusBadge";
import { cmsEditUrl, publicSiteUrl } from "@/lib/import/entityLinks";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REVERTABLE_STATUSES = new Set(["created", "updated"]);
const DELETABLE_STATUSES = new Set([
    "uploaded",
    "mapping",
    "dry_run_pending",
    "dry_run_ready",
    "failed",
]);
const PAGE_SIZE = 50;

const STATUS_BORDER_CLASS: Partial<Record<ImportSession["status"], string>> = {
    committed: "border-t-green-500",
    failed: "border-t-destructive",
    committing: "border-t-blue-500",
};

function readSlugFromDiff(diff: Record<string, unknown> | null): string | null {
    const entry = diff?.slug;
    if (typeof entry !== "object" || entry === null) return null;
    const current = (entry as Record<string, unknown>).current;
    return typeof current === "string" ? current : null;
}

function canContinueSession(session: ImportSession): boolean {
    return (
        session.status === "mapping" ||
        session.status === "dry_run_pending" ||
        session.status === "dry_run_ready" ||
        (session.status === "failed" && session.committedAt === null)
    );
}

function getDeleteConfirmMessage(
    t: ReturnType<typeof useTranslations>,
    session: ImportSession
): string {
    if (session.status === "failed" && session.committedAt !== null) {
        return t("deleteConfirmRollback", { filename: session.filename });
    }
    return t("deleteConfirm", { filename: session.filename });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ImportRow["status"] }) {
    const t = useTranslations("Cms.Import");
    return (
        <span
            className={`inline-flex items-center rounded-md border border-transparent px-2 py-0.5 text-xs font-medium ${statusBadgeClasses[status]}`}
        >
            {t(statusLabelKey[status])}
        </span>
    );
}

function SessionStatusBadge({ status }: { status: ImportSession["status"] }) {
    const t = useTranslations("Cms.Import.history");
    return (
        <span
            className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${SESSION_STATUS_CLASSES[status]}`}
        >
            {t(`sessionStatus.${status}`)}
        </span>
    );
}

type HistoryRowProps = {
    row: ImportRow;
    entityType: string;
    mapping: ImportMapping;
    revertingId: string | null;
    onRevert: (rowId: string) => void;
};

function HistoryRow({ row, entityType, mapping, revertingId, onRevert }: HistoryRowProps) {
    const t = useTranslations("Cms.Import.historyDetail");
    const canRevert = REVERTABLE_STATUSES.has(row.status);
    const isReverting = revertingId === row.id;

    const slug = readSlugFromDiff(row.diff);
    const viewUrl = row.targetEntityId !== null ? publicSiteUrl(entityType, slug) : null;

    const rowLabel = resolveRowLabel(row, mapping);

    let entityCell: React.ReactNode;
    if (row.status === "reverted") {
        entityCell = (
            <span className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs line-through">{rowLabel}</span>
                <span className="text-muted-foreground text-xs italic">{t("revertedLabel")}</span>
            </span>
        );
    } else if (row.targetEntityId !== null) {
        let editUrl: string | null = null;
        try {
            editUrl = cmsEditUrl(entityType, row.targetEntityId);
        } catch {
            editUrl = null;
        }
        entityCell = (
            <span className="flex flex-col gap-1">
                <span className="text-sm font-medium">{rowLabel}</span>
                {editUrl !== null ? (
                    <Link
                        href={editUrl}
                        className="text-xs font-medium underline-offset-2 hover:underline"
                    >
                        {t("editInCms")}
                    </Link>
                ) : (
                    <span className="font-mono text-xs">{row.targetEntityId}</span>
                )}
                {viewUrl !== null && (
                    <Link
                        href={viewUrl}
                        className="text-xs font-medium underline-offset-2 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {t("viewOnSite")}
                    </Link>
                )}
            </span>
        );
    } else {
        entityCell = <span className="text-muted-foreground text-xs">—</span>;
    }

    return (
        <TableRow
            className={cn(
                "hover:bg-muted/50 transition-colors",
                row.status === "reverted" && "opacity-60"
            )}
        >
            <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
            <TableCell>
                <StatusBadge status={row.status} />
            </TableCell>
            <TableCell>{entityCell}</TableCell>
            <TableCell className="text-xs">{row.warnings.length}</TableCell>
            <TableCell>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!canRevert || isReverting}
                    onClick={() => {
                        if (canRevert) {
                            onRevert(row.id);
                        }
                    }}
                >
                    {isReverting ? t("reverting") : t("revert")}
                </Button>
            </TableCell>
        </TableRow>
    );
}

// ─── Loading state ────────────────────────────────────────────────────────────

const SKELETON_COLUMNS = 5;
const SKELETON_ROWS = 5;

function LoadingSkeleton() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                {Array.from({ length: 4 }, (_, i) => (
                    <Skeleton key={i} className="h-4 w-48" />
                ))}
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {Array.from({ length: SKELETON_COLUMNS }, (_, i) => (
                                <TableHead key={i}>
                                    <Skeleton className="h-4 w-full" />
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                            <TableRow key={i}>
                                {Array.from({ length: SKELETON_COLUMNS }, (__, j) => (
                                    <TableCell key={j}>
                                        <Skeleton className="h-4 w-full" />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

// ─── HistoryDetail ────────────────────────────────────────────────────────────

type HistoryDetailProps = {
    sessionId: string;
};

export function HistoryDetail({ sessionId }: HistoryDetailProps) {
    const t = useTranslations("Cms.Import.historyDetail");
    const tErrors = useTranslations("Cms.Import.errors");
    const fmt = useFormatter();
    const router = useRouter();

    const [rollbackOpen, setRollbackOpen] = useState(false);
    const [revertingId, setRevertingId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<ImportRowStatus | "all">("all");
    const [page, setPage] = useState(1);

    const sessionQuery = useImportSession(sessionId);
    const rowStatsQuery = useImportRowStats(sessionId);
    const rowsQuery = useImportRows(sessionId, {
        page,
        limit: PAGE_SIZE,
        status: statusFilter === "all" ? null : statusFilter,
    });
    const revertRow = useRevertRow();
    const rollbackSession = useRollbackSession();
    const deleteSession = useDeleteImportSession();

    if (sessionQuery.isPending || rowsQuery.isPending || rowStatsQuery.isPending) {
        return <LoadingSkeleton />;
    }

    if (sessionQuery.isError) {
        return (
            <p role="alert" className="text-destructive mt-4 text-sm">
                {tErrors("sessionLoadFailed")}
            </p>
        );
    }

    if (rowsQuery.isError) {
        return (
            <p role="alert" className="text-destructive mt-4 text-sm">
                {tErrors("rowsLoadFailed")}
            </p>
        );
    }

    const session = sessionQuery.data;
    const rows = rowsQuery.data ?? [];
    const rowStats = rowStatsQuery.data;

    if (!session) {
        return null;
    }

    const committedAtFormatted = session.committedAt
        ? fmt.dateTime(new Date(session.committedAt), {
              dateStyle: "medium",
              timeStyle: "short",
          })
        : "—";

    function handleRevert(rowId: string) {
        setRevertingId(rowId);
        revertRow.mutate(
            { id: rowId, sessionId },
            {
                onSettled: () => setRevertingId(null),
                onSuccess: () => toast.success(t("revertSuccess")),
                onError: () => toast.error(tErrors("revertFailed")),
            }
        );
    }

    function handleRollbackConfirm() {
        setRollbackOpen(false);
        rollbackSession.mutate(sessionId, {
            onSuccess: () => toast.success(t("rollbackSuccess")),
            onError: () => toast.error(tErrors("rollbackFailed")),
        });
    }

    function handleDeleteSession() {
        if (typeof window !== "undefined" && window.confirm(getDeleteConfirmMessage(t, session))) {
            deleteSession.mutate(sessionId, {
                onSuccess: () => {
                    toast.success(t("deleteSuccess"));
                    router.push("/cms/import/history");
                },
                onError: () => toast.error(tErrors("deleteSessionFailed")),
            });
        }
    }

    const counts = {
        all: rowStats?.total ?? rows.length,
        created: rowStats?.created ?? 0,
        updated: rowStats?.updated ?? 0,
        skipped: rowStats?.skipped ?? 0,
        error: rowStats?.error ?? 0,
        reverted: rowStats?.reverted ?? 0,
    };
    const firstVisibleRow = rows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const lastVisibleRow = rows.length === 0 ? 0 : firstVisibleRow + rows.length - 1;
    const canGoPrevious = page > 1;
    const canGoNext =
        statusFilter === "all" ? lastVisibleRow < counts.all : rows.length === PAGE_SIZE;

    return (
        <div className="space-y-6">
            {/* Session metadata */}
            <div
                className={`border-foreground/10 bg-foreground/[0.02] rounded-md border border-t-2 p-4 ${STATUS_BORDER_CLASS[session.status] ?? "border-t-border"}`}
            >
                <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
                    <div>
                        <dt className="text-muted-foreground font-mono text-[9px] tracking-[1.5px] uppercase">
                            {t("filename")}
                        </dt>
                        <dd className="mt-1 truncate text-sm font-medium">{session.filename}</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground font-mono text-[9px] tracking-[1.5px] uppercase">
                            {t("entityType")}
                        </dt>
                        <dd className="mt-1 text-sm font-medium">{session.entityType}</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground font-mono text-[9px] tracking-[1.5px] uppercase">
                            {t("committedAt")}
                        </dt>
                        <dd className="mt-1 text-sm font-medium">{committedAtFormatted}</dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground font-mono text-[9px] tracking-[1.5px] uppercase">
                            {t("rowCount")}
                        </dt>
                        <dd className="mt-1 text-sm font-medium tabular-nums">
                            {session.rowCount}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-muted-foreground font-mono text-[9px] tracking-[1.5px] uppercase">
                            {t("status")}
                        </dt>
                        <dd className="mt-1">
                            <SessionStatusBadge status={session.status} />
                        </dd>
                    </div>
                </dl>
                {session.error !== null && (
                    <div
                        role="alert"
                        className="border-destructive/40 bg-destructive/10 text-destructive mt-3 rounded-md border px-3 py-2 text-sm"
                    >
                        <span className="font-medium">{t("sessionErrorTitle")}: </span>
                        {session.error}
                    </div>
                )}
            </div>

            {(canContinueSession(session) || DELETABLE_STATUSES.has(session.status)) && (
                <div className="flex items-center gap-3">
                    {canContinueSession(session) && (
                        <Button asChild>
                            <Link href={`/cms/import?session=${session.id}`}>
                                {t("continueSession")}
                            </Link>
                        </Button>
                    )}
                    {DELETABLE_STATUSES.has(session.status) && (
                        <Button
                            variant="outline"
                            onClick={handleDeleteSession}
                            disabled={deleteSession.isPending}
                        >
                            {t("delete")}
                        </Button>
                    )}
                </div>
            )}

            <div className="grid grid-cols-2 border border-r-0 border-b-0 sm:grid-cols-5">
                {(
                    [
                        ["created", counts.created],
                        ["updated", counts.updated],
                        ["skipped", counts.skipped],
                        ["error", counts.error],
                        ["reverted", counts.reverted],
                    ] as const
                ).map(([key, count]) => (
                    <div key={key} className="bg-background text-foreground border-r border-b p-4">
                        <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[1.5px] uppercase">
                            {t(`summary.${key}`)}
                        </p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums">{count}</p>
                    </div>
                ))}
            </div>

            <div className="border-border flex flex-col gap-4 border px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-foreground font-mono text-[10px] font-medium tracking-[1.5px] uppercase">
                        {t("totalRows", { total: counts.all })}
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {t("rowRange", { start: firstVisibleRow, end: lastVisibleRow })}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {(
                        [
                            ["all", t("filters.all"), counts.all],
                            ["created", t("filters.created"), counts.created],
                            ["updated", t("filters.updated"), counts.updated],
                            ["skipped", t("filters.skipped"), counts.skipped],
                            ["error", t("filters.error"), counts.error],
                            ["reverted", t("filters.reverted"), counts.reverted],
                        ] as [ImportRowStatus | "all", string, number][]
                    ).map(([key, label, count]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => {
                                setStatusFilter(key);
                                setPage(1);
                            }}
                            className={[
                                "border px-3 py-1 font-mono text-[10px] font-medium tracking-[1.5px] uppercase transition-colors",
                                statusFilter === key
                                    ? "bg-foreground text-background border-foreground"
                                    : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                            ].join(" ")}
                        >
                            {label} <span className="tabular-nums">{count}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Rows table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>{t("status")}</TableHead>
                            <TableHead>{t("entityColumn")}</TableHead>
                            <TableHead className="w-24">{t("warningsColumn")}</TableHead>
                            <TableHead className="w-32">{t("revert")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="text-muted-foreground py-10 text-center text-sm"
                                >
                                    {t("emptyRows")}
                                </TableCell>
                            </TableRow>
                        )}
                        {rows.map((row) => (
                            <HistoryRow
                                key={row.id}
                                row={row}
                                entityType={session.entityType}
                                mapping={session.mapping}
                                revertingId={revertingId}
                                onRevert={handleRevert}
                            />
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between gap-3">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!canGoPrevious}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                    {t("previous")}
                </Button>
                <span className="text-muted-foreground font-mono text-[10px] tracking-[1.5px] uppercase">
                    {t("pageLabel", { page })}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!canGoNext}
                    onClick={() => setPage((current) => current + 1)}
                >
                    {t("next")}
                </Button>
            </div>

            {session.status === "committed" && (
                <div className="border-destructive/30 rounded-md border p-4">
                    <p className="text-sm font-medium">{t("dangerZoneTitle")}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                        {t("dangerZoneDescription")}
                    </p>
                    <Button
                        variant="destructive"
                        className="mt-3"
                        onClick={() => setRollbackOpen(true)}
                    >
                        {t("rollback")}
                    </Button>
                </div>
            )}

            {/* Rollback confirm dialog */}
            <Dialog open={rollbackOpen} onOpenChange={setRollbackOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("rollbackConfirmTitle")}</DialogTitle>
                        <DialogDescription>{t("rollbackConfirmBody")}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRollbackOpen(false)}>
                            {t("rollbackCancel")}
                        </Button>
                        <Button variant="destructive" onClick={handleRollbackConfirm}>
                            {t("rollbackConfirmCta")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
