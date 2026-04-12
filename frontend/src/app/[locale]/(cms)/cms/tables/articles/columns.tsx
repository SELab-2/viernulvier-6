"use client";

import { ColumnDef } from "@tanstack/react-table";
import { SquarePen } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { StatusBadge } from "@/components/cms/status-badge";
import { makeActionsColumn } from "../actions-column";
import { Action, ActionDisplay } from "@/types/cms/actions";
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
    onEdit: (article: ArticleListItem) => void,
    t: ReturnType<typeof useTranslations<"Cms.ActionsColumn">>,
    tArticles: ReturnType<typeof useTranslations<"Cms.Articles">>
): ColumnDef<ArticleListItem>[] {
    const actions: Action<ArticleListItem>[] = [
        {
            key: "edit",
            label: t("edit", { label: "article" }),
            icon: SquarePen,
            display: ActionDisplay.Inline,
            onClick: onEdit,
        },
        {
            key: "copy-slug",
            label: t("copy", { key: "slug" }),
            onClick: async (article) => {
                const value = article.slug ?? "";
                try {
                    await navigator.clipboard.writeText(value);
                    toast.success(t("copied", { key: "slug" }));
                } catch {
                    toast.error(t("copyFailed"));
                }
            },
        },
    ];

    return [
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
        },
        {
            accessorKey: "title",
            header: tArticles("titleColumn"),
            cell: ({ row }) =>
                row.original.title ? (
                    <span className="font-display text-sm tracking-tight">
                        {row.original.title}
                    </span>
                ) : (
                    <span className="text-muted-foreground">—</span>
                ),
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
                    <span className="text-muted-foreground font-mono text-xs">
                        {formatDate(subjectPeriodStart)} – {formatDate(subjectPeriodEnd)}
                    </span>
                );
            },
        },
        makeActionsColumn({ actions }),
    ];
}
