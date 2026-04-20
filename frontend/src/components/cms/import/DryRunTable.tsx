// TODO: Revisit virtualisation once datasets exceed ~1000 rows.
"use client";

import { useTranslations } from "next-intl";

import type { ImportRow, ImportRowStatus } from "@/types/models/import.types";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type DryRunTableProps = {
    rows: ImportRow[];
    onSelectRow: (row: ImportRow) => void;
};

const statusBadgeClasses: Record<ImportRowStatus, string> = {
    pending: "bg-muted text-muted-foreground",
    will_create: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    will_update: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    will_skip: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    error: "bg-destructive/10 text-destructive",
    created: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-500",
    updated: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-500",
    skipped: "bg-muted text-muted-foreground",
    reverted: "bg-muted text-muted-foreground",
};

const statusLabelKey: Record<ImportRowStatus, string> = {
    pending: "table.statusLabels.pending",
    will_create: "table.statusLabels.willCreate",
    will_update: "table.statusLabels.willUpdate",
    will_skip: "table.statusLabels.willSkip",
    error: "table.statusLabels.error",
    created: "table.statusLabels.created",
    updated: "table.statusLabels.updated",
    skipped: "table.statusLabels.skipped",
    reverted: "table.statusLabels.reverted",
};

function StatusBadge({ status }: { status: ImportRowStatus }) {
    const t = useTranslations("Cms.Import");
    return (
        <span
            className={`inline-flex items-center rounded-md border border-transparent px-2 py-0.5 text-xs font-medium ${statusBadgeClasses[status]}`}
        >
            {t(statusLabelKey[status])}
        </span>
    );
}

function formatTarget(targetEntityId: string | null): string {
    if (targetEntityId === null) {
        return "—";
    }
    return `${targetEntityId.slice(0, 8)}…`;
}

export function DryRunTable({ rows, onSelectRow }: DryRunTableProps) {
    const t = useTranslations("Cms.Import");

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-12">{t("table.rowNumber")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead>{t("table.target")}</TableHead>
                    <TableHead className="w-24">{t("table.warnings")}</TableHead>
                    <TableHead className="w-16">{t("table.action")}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.map((row) => (
                    <TableRow
                        key={row.id}
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer"
                        onClick={() => onSelectRow(row)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onSelectRow(row);
                            }
                        }}
                    >
                        <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
                        <TableCell>
                            <StatusBadge status={row.status} />
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                            {formatTarget(row.targetEntityId)}
                        </TableCell>
                        <TableCell className="text-xs">{row.warnings.length}</TableCell>
                        <TableCell>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectRow(row);
                                }}
                            >
                                {t("table.open")}
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
