// frontend/src/components/collections/CollectionGrid.tsx
"use client";

import { useLocale } from "next-intl";
import { CollectionItem } from "@/types/models/collection.types";
import { CollectionItemCard, UniformCardsContext } from "./CollectionItemCard";

interface CollectionGridProps {
    items: CollectionItem[];
}

/**
 * Distributes items into `cols` buckets so that rendering each bucket
 * top-to-bottom (column-major) produces left-to-right reading order.
 *
 * Example — 6 items, 3 columns:
 *   col 0: [0, 3]   col 1: [1, 4]   col 2: [2, 5]
 *   → reads: 0 1 2 / 3 4 5  ✓
 */
function splitIntoColumns(items: CollectionItem[], cols: number): CollectionItem[][] {
    const rows = Math.ceil(items.length / cols);
    return Array.from({ length: cols }, (_, col) =>
        Array.from({ length: rows }, (_, row) => items[row * cols + col]).filter(Boolean)
    ) as CollectionItem[][];
}

interface MasonryColumnsProps {
    columns: CollectionItem[][];
    locale: string;
}

function MasonryColumns({ columns, locale }: MasonryColumnsProps) {
    return (
        <div className="flex items-start gap-4">
            {columns.map((col, ci) => (
                <div key={ci} className="flex flex-1 flex-col gap-4">
                    {col.map((item) => (
                        <CollectionItemCard key={item.id} item={item} locale={locale} />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function CollectionGrid({ items }: CollectionGridProps) {
    const locale = useLocale();
    const sorted = [...items].sort((a, b) => a.position - b.position);

    return (
        <section>
            <div className="sm:hidden">
                <UniformCardsContext.Provider value={true}>
                    <MasonryColumns columns={[sorted]} locale={locale} />
                </UniformCardsContext.Provider>
            </div>
            <div className="hidden sm:block lg:hidden">
                <MasonryColumns columns={splitIntoColumns(sorted, 2)} locale={locale} />
            </div>
            <div className="hidden lg:block">
                <MasonryColumns columns={splitIntoColumns(sorted, 3)} locale={locale} />
            </div>
        </section>
    );
}
