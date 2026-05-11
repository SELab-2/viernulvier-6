"use client";

import { useLocale } from "next-intl";

import { MasonryGrid } from "./masonry-grid";
import { EntityCard } from "./entity-card";
import type { EntityGridItem } from "@/types/models/collection.types";

export function EntityGrid({ items }: { items: EntityGridItem[] }) {
    const locale = useLocale();
    return (
        <MasonryGrid
            items={items}
            renderItem={(item) => <EntityCard item={item} locale={locale} />}
        />
    );
}
