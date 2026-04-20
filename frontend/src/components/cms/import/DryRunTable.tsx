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
import { statusBadgeClasses, statusLabelKey } from "./statusBadge";

type DryRunTableProps = {
    rows: ImportRow[];
    onSelectRow: (row: ImportRow) => void;
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

const COLUMNS = 5;

export function DryRunTable({ rows, onSelectRow }: DryRunTableProps) {
    const t = useTranslations("Cms.Import");

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12">{t("table.rowNumber")}</TableHead>
                        <TableHead className="w-36">{t("table.status")}</TableHead>
                        <TableHead>{t("table.target")}</TableHead>
                        <TableHead className="w-24">{t("table.warnings")}</TableHead>
                        <TableHead className="w-20">{t("table.action")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.length === 0 && (
                        <TableRow>
                            <TableCell
                                colSpan={COLUMNS}
                                className="text-muted-foreground py-8 text-center text-sm"
                            >
                                {t("summary.running")}
                            </TableCell>
                        </TableRow>
                    )}
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
        </div>
    );
}
