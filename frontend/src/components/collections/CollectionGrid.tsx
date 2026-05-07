"use client";

import { useLocale } from "next-intl";

import { EntityGrid } from "@/components/masonry/entity-grid";
import type { CollectionItem } from "@/types/models/collection.types";
import type { EntityGridItem } from "@/types/models/collection.types";

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

export function CollectionGrid({ items }: { items: CollectionItem[] }) {
    const locale = useLocale();
    const gridItems = [...items]
        .filter((item) => item.contentType !== "event")
        .sort((a, b) => a.position - b.position)
        .map((item) => toEntityGridItem(item, locale));

    return (
        <section>
            <EntityGrid items={gridItems} />
        </section>
    );
}
