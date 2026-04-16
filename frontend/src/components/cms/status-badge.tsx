"use client";

import { ArticleStatus } from "@/types/models/article.types";

export const statusStyles: Record<ArticleStatus, string> = {
    published: "bg-foreground text-background",
    draft: "bg-transparent text-muted-foreground",
    archived: "bg-muted/20 text-muted-foreground",
};

export function StatusBadge({ status }: { status: ArticleStatus }) {
    return (
        <span
            className={`inline-flex items-center rounded-md border border-transparent px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[status]}`}
        >
            {status}
        </span>
    );
}
