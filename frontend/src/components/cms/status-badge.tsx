"use client";

import { useTranslations } from "next-intl";

import { ArticleStatus } from "@/types/models/article.types";

export const statusStyles: Record<ArticleStatus, string> = {
    published: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    archived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
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
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}
        >
            {t(statusKeyMap[status])}
        </span>
    );
}
