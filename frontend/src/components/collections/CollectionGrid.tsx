// frontend/src/components/collections/CollectionGrid.tsx
"use client";

import { useLocale } from "next-intl";
import { CollectionItem } from "@/types/models/collection.types";
import { CollectionItemCard } from "./CollectionItemCard";

interface CollectionGridProps {
    items: CollectionItem[];
}

export function CollectionGrid({ items }: CollectionGridProps) {
    const locale = useLocale();

    const sorted = [...items].sort((a, b) => a.position - b.position);

    return (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((item) => (
                <CollectionItemCard key={item.id} item={item} locale={locale} />
            ))}
        </section>
    );
}
