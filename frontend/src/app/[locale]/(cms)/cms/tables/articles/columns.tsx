"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight, SquarePen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { StatusBadge } from "@/components/cms/status-badge";
import { CollectionPickerSubmenu } from "@/components/cms/collection-picker-submenu";
import { CmsThumbnail } from "@/components/cms/cms-thumbnail";
import { EntityTagStrip } from "@/components/shared/entity-tag-strip";
import { makeActionsColumn } from "../actions-column";
import { Action, ActionDisplay, ActionVariant } from "@/types/cms/actions";
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
    onDelete: (article: ArticleListItem) => void,
    t: ReturnType<typeof useTranslations<"Cms.ActionsColumn">>,
    tArticles: ReturnType<typeof useTranslations<"Cms.Articles">>,
    locale: string
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
        {
            key: "open-public",
            label: t("open", { label: "article" }),
            icon: ArrowUpRight,
            onClick: (article) => {
                window.location.assign(`/${locale}/articles/${article.slug}`);
            },
        },
        {
            key: "add-to-collection",
            render: (article, closeMenu) => (
                <CollectionPickerSubmenu
                    item={{
                        contentId: article.id,
                        contentType: "blogpost",
                        label: article.slug ?? article.id,
                    }}
                    onComplete={closeMenu}
                />
            ),
        },
        {
            key: "delete",
            label: t("delete", { label: "article" }),
            icon: Trash2,
            variant: ActionVariant.Destructive,
            onClick: onDelete,
        },
    ];

    return [
        {
            id: "cover",
            header: "",
            cell: ({ row }) => {
                const url = row.original.coverImageUrl;
                if (!url) return <CmsThumbnail src={null} alt="" />;
                return <CmsThumbnail src={url} alt={row.original.title ?? row.original.slug} />;
            },
            size: 52,
        },
        {
            accessorKey: "status",
            header: tArticles("statusColumn"),
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
            header: tArticles("dateRangeColumn"),
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
        {
            id: "tags",
            header: "Tags",
            enableSorting: false,
            cell: ({ row }) => (
                <EntityTagStrip
                    tags={row.original.tags}
                    locale={locale}
                    cap={3}
                    variant="compact"
                />
            ),
        },
        makeActionsColumn({ actions }),
    ];
}
