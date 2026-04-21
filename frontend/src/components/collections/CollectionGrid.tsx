// frontend/src/components/collections/CollectionGrid.tsx
"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { CollectionItem } from "@/types/models/collection.types";
import { CollectionItemCard, UniformCardsContext } from "./CollectionItemCard";

const SM_BREAKPOINT = 640;
const LG_BREAKPOINT = 1024;

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

function useCollectionColumnCount() {
    const [width, setWidth] = useState(() =>
        typeof window !== "undefined" ? window.innerWidth : LG_BREAKPOINT
    );

    useEffect(() => {
        const onResize = () => setWidth(window.innerWidth);
        onResize();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    if (width < SM_BREAKPOINT) return 1;
    if (width < LG_BREAKPOINT) return 2;
    return 3;
}

export function CollectionGrid({ items }: CollectionGridProps) {
    const locale = useLocale();
    const sorted = [...items].sort((a, b) => a.position - b.position);
    const columnCount = useCollectionColumnCount();
    const columns = columnCount === 1 ? [sorted] : splitIntoColumns(sorted, columnCount);

    return (
        <section>
            <UniformCardsContext.Provider value={columnCount === 1}>
                <MasonryColumns columns={columns} locale={locale} />
            </UniformCardsContext.Provider>
        </section>
    );
}
