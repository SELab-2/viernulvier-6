"use client";

import { useTranslations } from "next-intl";

import { ArticleStatus } from "@/types/models/article.types";

export const statusStyles: Record<ArticleStatus, string> = {
    published: "bg-foreground text-background",
    draft: "bg-transparent text-muted-foreground",
    archived: "bg-muted/20 text-muted-foreground",
};

const statusKeyMap: Record<ArticleStatus, string> = {
    published: "statusPublished",
    draft: "statusDraft",
    archived: "statusArchived",
};

export function StatusBadge({ status }: { status: ArticleStatus }) {
    const t = useTranslations("Cms.Articles");
    return (
        <span
            className={`inline-flex items-center rounded-md border border-transparent px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[status]}`}
        >
            {t(statusKeyMap[status])}
        </span>
    );
}
