"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";

import { DataTable } from "../data-table";
import { useGetImportErrors } from "@/hooks/api/useImportErrors";
import { ImportErrorResponse } from "@/types/api/import-error.api.types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

function formatDateTime(value: string): string {
    return new Date(value).toLocaleString("nl-BE", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Brussels",
    });
}

function renderOptionalValue(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") {
        return <span className="text-muted-foreground">—</span>;
    }

    return String(value);
}

type StatusFilter = "unresolved" | "resolved";

export function ImportErrorsTable() {
    const t = useTranslations("Cms.ImportErrors");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("unresolved");
    const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const currentCursor = cursorHistory[currentPageIndex];

    const { data, isLoading } = useGetImportErrors({
        pagination: currentCursor ? { cursor: currentCursor, limit: 50 } : { limit: 50 },
        resolved: statusFilter === "resolved",
    });

    const handleStatusChange = (next: string) => {
        if (next !== "unresolved" && next !== "resolved") return;
        setStatusFilter(next);
        // Reset pagination — cursors are scoped to a specific filter on the
        // backend, so we cannot reuse them when the resolved filter flips.
        setCursorHistory([null]);
        setCurrentPageIndex(0);
    };

    const columns = useMemo<ColumnDef<ImportErrorResponse>[]>(
        () => [
            {
                accessorKey: "severity",
                header: t("severity"),
                cell: ({ row }) => (
                    <span className="font-medium capitalize">{row.original.severity}</span>
                ),
            },
            {
                accessorKey: "entity",
                header: t("entity"),
                cell: ({ row }) => <span className="capitalize">{row.original.entity}</span>,
            },
            {
                accessorKey: "source_id",
                header: t("sourceId"),
                cell: ({ row }) => renderOptionalValue(row.original.source_id),
            },
            {
                accessorKey: "error_kind",
                header: t("errorKind"),
                cell: ({ row }) => row.original.error_kind,
            },
            {
                id: "relation",
                header: t("relation"),
                cell: ({ row }) => {
                    const { relation, relation_source_id } = row.original;
                    if (!relation && relation_source_id == null) {
                        return <span className="text-muted-foreground">—</span>;
                    }

                    if (relation && relation_source_id != null) {
                        return `${relation} (${relation_source_id})`;
                    }

                    return renderOptionalValue(relation ?? relation_source_id);
                },
            },
            {
                accessorKey: "message",
                header: t("message"),
                cell: ({ row }) => (
                    <span className="block max-w-xl whitespace-normal">{row.original.message}</span>
                ),
            },
            {
                accessorKey: "last_seen_at",
                header: t("lastSeen"),
                cell: ({ row }) => formatDateTime(row.original.last_seen_at),
            },
        ],
        [t]
    );

    return (
        <div className="space-y-4 p-4">
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold">{t("title")}</h1>
                <p className="text-muted-foreground text-sm">{t("description")}</p>
            </div>

            <Tabs value={statusFilter} onValueChange={handleStatusChange}>
                <TabsList>
                    <TabsTrigger value="unresolved">{t("unresolvedTab")}</TabsTrigger>
                    <TabsTrigger value="resolved">{t("resolvedTab")}</TabsTrigger>
                </TabsList>
            </Tabs>

            <DataTable columns={columns} data={data?.data ?? []} loading={isLoading} />

            <div className="flex justify-end gap-2">
                <Button
                    variant="outline"
                    onClick={() => setCurrentPageIndex((current) => Math.max(0, current - 1))}
                    disabled={currentPageIndex === 0 || isLoading}
                >
                    {t("previousPage")}
                </Button>
                <Button
                    variant="outline"
                    onClick={() => {
                        if (!data?.nextCursor) return;

                        setCursorHistory((current) => {
                            if (current[currentPageIndex + 1] === data.nextCursor) {
                                return current;
                            }

                            return [...current.slice(0, currentPageIndex + 1), data.nextCursor];
                        });
                        setCurrentPageIndex((current) => current + 1);
                    }}
                    disabled={data?.nextCursor == null || isLoading}
                >
                    {t("nextPage")}
                </Button>
            </div>
        </div>
    );
}
