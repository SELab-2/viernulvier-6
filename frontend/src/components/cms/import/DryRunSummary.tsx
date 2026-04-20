"use client";

import { useTranslations } from "next-intl";

import type { ImportRow, ImportSessionStatus } from "@/types/models/import.types";

type DryRunSummaryProps = {
    rows: ImportRow[];
    sessionStatus: ImportSessionStatus;
};

type StatusCounts = {
    willCreate: number;
    willUpdate: number;
    willSkip: number;
    errors: number;
};

function countStatuses(rows: ImportRow[]): StatusCounts {
    return rows.reduce<StatusCounts>(
        (acc, row) => {
            switch (row.status) {
                case "will_create":
                    return { ...acc, willCreate: acc.willCreate + 1 };
                case "will_update":
                    return { ...acc, willUpdate: acc.willUpdate + 1 };
                case "will_skip":
                    return { ...acc, willSkip: acc.willSkip + 1 };
                case "error":
                    return { ...acc, errors: acc.errors + 1 };
                default:
                    return acc;
            }
        },
        { willCreate: 0, willUpdate: 0, willSkip: 0, errors: 0 }
    );
}

export function DryRunSummary({ rows, sessionStatus }: DryRunSummaryProps) {
    const t = useTranslations("Cms.Import");
    const counts = countStatuses(rows);
    const isPending = sessionStatus === "dry_run_pending";

    return (
        <div className="space-y-4">
            {isPending && (
                <div
                    role="progressbar"
                    aria-label={t("summary.running")}
                    className="bg-muted h-1 w-full overflow-hidden rounded-full"
                >
                    <div className="bg-primary/30 absolute inset-0 animate-pulse" />
                </div>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="bg-card text-card-foreground rounded-lg border p-4 shadow-sm">
                    <p className="text-muted-foreground text-xs font-medium">
                        {t("summary.willCreate")}
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{counts.willCreate}</p>
                </div>
                <div className="bg-card text-card-foreground rounded-lg border p-4 shadow-sm">
                    <p className="text-muted-foreground text-xs font-medium">
                        {t("summary.willUpdate")}
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{counts.willUpdate}</p>
                </div>
                <div className="bg-card text-card-foreground rounded-lg border p-4 shadow-sm">
                    <p className="text-muted-foreground text-xs font-medium">
                        {t("summary.willSkip")}
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{counts.willSkip}</p>
                </div>
                <div
                    className={`rounded-lg border p-4 shadow-sm ${
                        counts.errors > 0
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : "bg-card text-card-foreground"
                    }`}
                >
                    <p className="text-xs font-medium opacity-70">{t("summary.errors")}</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{counts.errors}</p>
                </div>
            </div>
        </div>
    );
}
