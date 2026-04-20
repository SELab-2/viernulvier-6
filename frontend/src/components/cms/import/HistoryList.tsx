"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";

import { Link } from "@/i18n/routing";
import { useImportSessions } from "@/hooks/api/useImport";
import type { ImportSession } from "@/types/models/import.types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { SESSION_STATUS_CLASSES } from "./sessionStatusBadge";

const LIMIT = 20;
const SKELETON_ROW_COUNT = 7;
const COLUMNS = 6;
const CONTINUABLE_STATUSES = new Set(["mapping", "dry_run_pending", "dry_run_ready", "failed"]);

// ─── Sub-components ────────────────────────────────────────────────────────────

function SkeletonRows() {
    return (
        <>
            {Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => (
                <TableRow key={i}>
                    {Array.from({ length: COLUMNS }, (__, j) => (
                        <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </>
    );
}

type SessionRowProps = {
    session: ImportSession;
    openLabel: string;
    continueLabel: string;
    statusLabel: string;
};

function SessionRow({ session, openLabel, continueLabel, statusLabel }: SessionRowProps) {
    const fmt = useFormatter();
    const formattedDate = fmt.dateTime(new Date(session.createdAt), {
        dateStyle: "short",
        timeStyle: "short",
    });

    return (
        <TableRow className="hover:bg-muted/50 transition-colors">
            <TableCell className="w-36 text-xs whitespace-nowrap">{formattedDate}</TableCell>
            <TableCell className="w-32">{session.entityType}</TableCell>
            <TableCell className="max-w-[200px] truncate text-sm">{session.filename}</TableCell>
            <TableCell className="w-36">
                <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${SESSION_STATUS_CLASSES[session.status]}`}
                >
                    {statusLabel}
                </span>
            </TableCell>
            <TableCell className="w-20 text-right text-xs tabular-nums">
                {session.rowCount}
            </TableCell>
            <TableCell className="w-32">
                <div className="flex flex-col gap-1">
                    <Link
                        href={`/cms/import/history/${session.id}`}
                        className="text-sm font-medium underline-offset-2 hover:underline"
                    >
                        {openLabel}
                    </Link>
                    {CONTINUABLE_STATUSES.has(session.status) && (
                        <Link
                            href={`/cms/import?session=${session.id}`}
                            className="text-primary text-xs font-medium underline-offset-2 hover:underline"
                        >
                            {continueLabel}
                        </Link>
                    )}
                </div>
            </TableCell>
        </TableRow>
    );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
    const t = useTranslations("Cms.Import.history");
    return (
        <TableRow>
            <TableCell colSpan={COLUMNS} className="py-12 text-center">
                <p className="text-foreground text-sm font-medium">{t("empty")}</p>
                <p className="text-muted-foreground mt-1 text-xs">{t("emptyHelperText")}</p>
            </TableCell>
        </TableRow>
    );
}

// ─── HistoryList ───────────────────────────────────────────────────────────────

export function HistoryList() {
    const t = useTranslations("Cms.Import.history");
    const tErrors = useTranslations("Cms.Import.errors");
    const [page, setPage] = useState(1);

    const { data, isPending, isError } = useImportSessions({ page, limit: LIMIT });

    const isNextDisabled = !data || data.length < LIMIT;
    const isPrevDisabled = page === 1;

    if (isError) {
        return (
            <div
                role="alert"
                className="border-destructive/40 bg-destructive/10 text-destructive mt-4 rounded-md border px-4 py-3 text-sm"
            >
                <p className="font-medium">{tErrors("historyLoadFailed")}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-36">{t("columns.createdAt")}</TableHead>
                            <TableHead className="w-32">{t("columns.entityType")}</TableHead>
                            <TableHead>{t("columns.filename")}</TableHead>
                            <TableHead className="w-36">{t("columns.status")}</TableHead>
                            <TableHead className="w-20 text-right">
                                {t("columns.rowCount")}
                            </TableHead>
                            <TableHead className="w-20">{t("columns.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isPending && <SkeletonRows />}
                        {!isPending && data && data.length === 0 && page === 1 && <EmptyState />}
                        {!isPending &&
                            data &&
                            data.map((session) => (
                                <SessionRow
                                    key={session.id}
                                    session={session}
                                    openLabel={t("open")}
                                    continueLabel={t("continue")}
                                    statusLabel={t(`sessionStatus.${session.status}`)}
                                />
                            ))}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-center gap-4">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={isPrevDisabled}
                    onClick={() => setPage((p) => p - 1)}
                >
                    {t("previous")}
                </Button>
                <span className="text-muted-foreground font-mono text-xs">
                    {t("pageLabel", { page })}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={isNextDisabled}
                    onClick={() => setPage((p) => p + 1)}
                >
                    {t("next")}
                </Button>
            </div>
        </div>
    );
}
