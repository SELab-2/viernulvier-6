"use client";

import { ColumnDef } from "@tanstack/react-table";

import { StatusBadge } from "@/components/cms/status-badge";
import { makeActionsColumn } from "../actions-column";
import { ArticleListItem } from "@/types/models/article.types";

function formatDate(date: string | null): string {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "Europe/Brussels",
    });
}

export function makeArticleColumns(
    onEdit: (article: ArticleListItem) => void
): ColumnDef<ArticleListItem>[] {
    return [
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
        },
        {
            accessorKey: "title",
            header: "Title",
            cell: ({ row }) =>
                row.original.title ?? <span className="text-muted-foreground">—</span>,
        },
        {
            id: "subjectPeriod",
            header: "Date range",
            cell: ({ row }) => {
                const { subjectPeriodStart, subjectPeriodEnd } = row.original;
                if (!subjectPeriodStart && !subjectPeriodEnd) {
                    return <span className="text-muted-foreground">—</span>;
                }
                return (
                    <span>
                        {formatDate(subjectPeriodStart)} – {formatDate(subjectPeriodEnd)}
                    </span>
                );
            },
        },
        makeActionsColumn({ label: "article", copyKey: "slug", onEdit }),
    ];
}
