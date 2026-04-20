"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";

import { Link } from "@/i18n/routing";
import {
    useImportSession,
    useImportRows,
    useRevertRow,
    useRollbackSession,
} from "@/hooks/api/useImport";
import type { ImportRow, ImportSession } from "@/types/models/import.types";
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

function readSlugFromDiff(diff: Record<string, unknown> | null): string | null {
    const entry = diff?.slug;
    if (typeof entry !== "object" || entry === null) return null;
    const current = (entry as Record<string, unknown>).current;
    return typeof current === "string" ? current : null;
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
    revertingId: string | null;
    onRevert: (rowId: string) => void;
};

function HistoryRow({ row, entityType, revertingId, onRevert }: HistoryRowProps) {
    const t = useTranslations("Cms.Import.historyDetail");
    const canRevert = REVERTABLE_STATUSES.has(row.status);
    const isReverting = revertingId === row.id;

    const slug = readSlugFromDiff(row.diff);
    const viewUrl = row.targetEntityId !== null ? publicSiteUrl(entityType, slug) : null;

    let editLink: React.ReactNode = "—";
    if (row.targetEntityId !== null) {
        let editUrl: string | null = null;
        try {
            editUrl = cmsEditUrl(entityType, row.targetEntityId);
        } catch {
            editUrl = null;
        }

        editLink = (
            <span className="flex flex-col gap-1">
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
    }

    return (
        <TableRow>
            <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
            <TableCell>
                <StatusBadge status={row.status} />
            </TableCell>
            <TableCell>{editLink}</TableCell>
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

    const [rollbackOpen, setRollbackOpen] = useState(false);
    const [revertingId, setRevertingId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const sessionQuery = useImportSession(sessionId);
    const rowsQuery = useImportRows(sessionId);
    const revertRow = useRevertRow();
    const rollbackSession = useRollbackSession();

    if (sessionQuery.isPending || rowsQuery.isPending) {
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
        setErrorMessage(null);
        setRevertingId(rowId);
        revertRow.mutate(
            { id: rowId, sessionId },
            {
                onSettled: () => setRevertingId(null),
                onError: () => setErrorMessage(tErrors("revertFailed")),
            }
        );
    }

    function handleRollbackConfirm() {
        setErrorMessage(null);
        setRollbackOpen(false);
        rollbackSession.mutate(sessionId, {
            onError: () => setErrorMessage(tErrors("rollbackFailed")),
        });
    }

    return (
        <div className="space-y-6">
            {/* Session metadata */}
            <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-5">
                <div>
                    <dt className="text-muted-foreground font-medium">{t("filename")}</dt>
                    <dd className="mt-0.5 truncate">{session.filename}</dd>
                </div>
                <div>
                    <dt className="text-muted-foreground font-medium">{t("entityType")}</dt>
                    <dd className="mt-0.5">{session.entityType}</dd>
                </div>
                <div>
                    <dt className="text-muted-foreground font-medium">{t("committedAt")}</dt>
                    <dd className="mt-0.5">{committedAtFormatted}</dd>
                </div>
                <div>
                    <dt className="text-muted-foreground font-medium">{t("rowCount")}</dt>
                    <dd className="mt-0.5">{session.rowCount}</dd>
                </div>
                <div>
                    <dt className="text-muted-foreground font-medium">{t("status")}</dt>
                    <dd className="mt-0.5">
                        <SessionStatusBadge status={session.status} />
                    </dd>
                </div>
            </dl>

            {/* Rows table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>{t("status")}</TableHead>
                            <TableHead>Entity</TableHead>
                            <TableHead className="w-24">Warnings</TableHead>
                            <TableHead className="w-32">{t("revert")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row) => (
                            <HistoryRow
                                key={row.id}
                                row={row}
                                entityType={session.entityType}
                                revertingId={revertingId}
                                onRevert={handleRevert}
                            />
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Footer: rollback + error */}
            <div className="flex flex-col gap-2">
                {errorMessage !== null && (
                    <p role="alert" className="text-destructive text-sm">
                        {errorMessage}
                    </p>
                )}
                {session.status === "committed" && (
                    <div>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                setErrorMessage(null);
                                setRollbackOpen(true);
                            }}
                        >
                            {t("rollback")}
                        </Button>
                    </div>
                )}
            </div>

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
