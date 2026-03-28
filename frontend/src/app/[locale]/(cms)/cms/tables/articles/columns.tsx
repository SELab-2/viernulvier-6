"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { StatusBadge } from "@/components/cms/status-badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "@/i18n/routing";
import { ArticleListItem } from "@/types/models/article.types";

function ArticleActionsCell({ article }: { article: ArticleListItem }) {
    const t = useTranslations("Cms.ActionsColumn");
    const router = useRouter();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">{t("openMenu")}</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
                <DropdownMenuItem
                    onClick={async () => {
                        try {
                            await navigator.clipboard.writeText(article.slug);
                            toast.success(t("copied", { key: "slug" }));
                        } catch {
                            toast.error(t("copyFailed"));
                        }
                    }}
                >
                    {t("copy", { key: "slug" })}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/cms/articles/${article.id}/edit`)}>
                    {t("edit", { label: "article" })}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function makeArticleColumns(): ColumnDef<ArticleListItem>[] {
    return [
        {
            accessorKey: "titleNl",
            header: "Title (NL)",
            cell: ({ row }) =>
                row.original.titleNl ?? <span className="text-muted-foreground">—</span>,
        },
        {
            accessorKey: "titleEn",
            header: "Title (EN)",
            cell: ({ row }) =>
                row.original.titleEn ?? <span className="text-muted-foreground">—</span>,
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
        },
        {
            id: "actions",
            cell: ({ row }) => <ArticleActionsCell article={row.original} />,
        },
    ];
}
