"use client";

import { useTranslations } from "next-intl";

import { CollectionVisibility } from "@/types/models/collection.types";

const visibilityStyles: Record<CollectionVisibility, string> = {
    public: "bg-foreground text-background",
    unlisted: "bg-transparent text-muted-foreground",
};

const visibilityKeyMap: Record<CollectionVisibility, string> = {
    public: "visibilityPublic",
    unlisted: "visibilityUnlisted",
};

export function VisibilityBadge({ visibility }: { visibility: CollectionVisibility }) {
    const t = useTranslations("Cms.Collections");
    return (
        <span
            className={`inline-flex items-center rounded-md border border-transparent px-2 py-0.5 text-xs font-medium capitalize ${visibilityStyles[visibility]}`}
        >
            {t(visibilityKeyMap[visibility])}
        </span>
    );
}
