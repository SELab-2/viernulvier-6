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
        <section className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {sorted.map((item) => (
                <div key={item.id} className="mb-4 break-inside-avoid">
                    <CollectionItemCard item={item} locale={locale} />
                </div>
            ))}
        </section>
    );
}
