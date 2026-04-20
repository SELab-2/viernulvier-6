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
    statusLabel: string;
};

function SessionRow({ session, openLabel, statusLabel }: SessionRowProps) {
    const fmt = useFormatter();
    const formattedDate = fmt.dateTime(new Date(session.createdAt), {
        dateStyle: "short",
        timeStyle: "short",
    });

    return (
        <TableRow>
            <TableCell className="whitespace-nowrap">{formattedDate}</TableCell>
            <TableCell>{session.entityType}</TableCell>
            <TableCell className="max-w-[200px] truncate">{session.filename}</TableCell>
            <TableCell>
                <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${SESSION_STATUS_CLASSES[session.status]}`}
                >
                    {statusLabel}
                </span>
            </TableCell>
            <TableCell className="text-right">{session.rowCount}</TableCell>
            <TableCell>
                <Link
                    href={`/cms/import/history/${session.id}`}
                    className="text-sm font-medium underline-offset-2 hover:underline"
                >
                    {openLabel}
                </Link>
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
            <p role="alert" className="text-destructive mt-4 text-sm">
                {tErrors("historyLoadFailed")}
            </p>
        );
    }

    return (
        <div className="mt-4 space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("columns.createdAt")}</TableHead>
                            <TableHead>{t("columns.entityType")}</TableHead>
                            <TableHead>{t("columns.filename")}</TableHead>
                            <TableHead>{t("columns.status")}</TableHead>
                            <TableHead className="text-right">{t("columns.rowCount")}</TableHead>
                            <TableHead>{t("columns.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isPending && <SkeletonRows />}
                        {!isPending && data && data.length === 0 && page === 1 && (
                            <TableRow>
                                <TableCell
                                    colSpan={COLUMNS}
                                    className="text-muted-foreground py-8 text-center text-sm"
                                >
                                    {t("empty")}
                                </TableCell>
                            </TableRow>
                        )}
                        {!isPending &&
                            data &&
                            data.map((session) => (
                                <SessionRow
                                    key={session.id}
                                    session={session}
                                    openLabel={t("open")}
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
                <span className="text-muted-foreground text-sm">{t("pageLabel", { page })}</span>
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
