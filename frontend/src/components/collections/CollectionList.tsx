"use client";

import { useLocale } from "next-intl";

import { EntityListItem } from "./EntityListItem";
import type { CollectionItem, EntityGridItem } from "@/types/models/collection.types";

function toEntityGridItem(item: CollectionItem, locale: string): EntityGridItem {
    return {
        id: item.id,
        contentType: item.contentType,
        contentId: item.contentId,
        position: item.position,
        comment:
            item.translations.find((tr) => tr.languageCode === locale)?.comment ??
            item.translations[0]?.comment ??
            null,
    };
}

export function CollectionList({ items }: { items: CollectionItem[] }) {
    const locale = useLocale();
    const listItems = [...items]
        .filter((item) => item.contentType !== "event")
        .sort((a, b) => a.position - b.position)
        .map((item) => toEntityGridItem(item, locale));

    return (
        <section className="space-y-2">
            {listItems.map((item) => (
                <EntityListItem key={item.id} item={item} locale={locale} />
            ))}
        </section>
    );
}
