"use client";

import { useTranslations } from "next-intl";

import type { ImportRow, ImportRowStats, ImportSessionStatus } from "@/types/models/import.types";

type DryRunSummaryProps = {
    rows: ImportRow[];
    stats?: ImportRowStats;
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

export function DryRunSummary({ rows, stats, sessionStatus }: DryRunSummaryProps) {
    const t = useTranslations("Cms.Import");
    const pageCounts = countStatuses(rows);
    const counts = stats
        ? {
              willCreate: stats.willCreate,
              willUpdate: stats.willUpdate,
              willSkip: stats.willSkip,
              errors: stats.error,
          }
        : pageCounts;
    const isPending = sessionStatus === "dry_run_pending";

    return (
        <div className="space-y-4">
            {isPending && (
                <div className="space-y-2">
                    <div
                        role="progressbar"
                        aria-label={t("summary.running")}
                        className="bg-muted h-1 w-full overflow-hidden rounded-full"
                    >
                        <div className="bg-primary/40 h-full w-full animate-pulse" />
                    </div>
                    <p className="text-muted-foreground animate-pulse text-center text-xs">
                        {t("dryRun.pendingLabel")}
                    </p>
                </div>
            )}
            <div className="grid grid-cols-2 border border-r-0 border-b-0 sm:grid-cols-4">
                <div className="bg-background text-foreground border-r border-b p-4">
                    <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[1.5px] uppercase">
                        {t("summary.willCreate")}
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{counts.willCreate}</p>
                </div>
                <div className="bg-background text-foreground border-r border-b p-4">
                    <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[1.5px] uppercase">
                        {t("summary.willUpdate")}
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{counts.willUpdate}</p>
                </div>
                <div className="bg-background text-foreground border-r border-b p-4">
                    <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[1.5px] uppercase">
                        {t("summary.willSkip")}
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{counts.willSkip}</p>
                </div>
                <div
                    className={`border-r border-b p-4 ${
                        counts.errors > 0
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : "bg-background text-foreground"
                    }`}
                >
                    <p className="font-mono text-[10px] font-medium tracking-[1.5px] uppercase opacity-70">
                        {t("summary.errors")}
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{counts.errors}</p>
                </div>
            </div>
        </div>
    );
}
