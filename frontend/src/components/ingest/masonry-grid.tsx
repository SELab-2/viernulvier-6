"use client";

import { ReactNode } from "react";
import { UniformCardsContext } from "@/components/collections/CollectionItemCard";

export type ColumnCount = 2 | 3 | 4 | 5 | 6;

interface MasonryGridProps {
    children: ReactNode;
    columns?: ColumnCount;
}

const COLUMN_CLASSES: Record<ColumnCount, string> = {
    2: "columns-1 gap-3 sm:columns-2",
    3: "columns-1 gap-3 sm:columns-2 lg:columns-3",
    4: "columns-1 gap-3 sm:columns-2 md:columns-3 lg:columns-4",
    5: "columns-1 gap-3 sm:columns-2 md:columns-3 lg:columns-5",
    6: "columns-1 gap-3 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-6",
};

/**
 * Generic masonry layout using CSS columns.
 *
 * The `columns` prop sets the maximum column count on large screens.
 * Responsive downscaling is automatic (always at least 1 column on mobile).
 *
 * UniformCardsContext forces uniform aspect ratios on the narrowest
 * breakpoint to avoid ragged column breaks.
 */
export function MasonryGrid({ children, columns = 3 }: MasonryGridProps) {
    return (
        <UniformCardsContext.Provider value={true}>
            <div className={COLUMN_CLASSES[columns]}>{children}</div>
        </UniformCardsContext.Provider>
    );
}
