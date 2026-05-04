"use client";

import { ReactNode } from "react";

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
 * Masonry layout using CSS columns.
 *
 * Items flow top-to-bottom per column, creating a Pinterest-style
 * masonry effect when cards have varying heights.
 *
 * The `columns` prop sets the max column count on large screens.
 */
export function MasonryGrid({ children, columns = 3 }: MasonryGridProps) {
    return <div className={COLUMN_CLASSES[columns]}>{children}</div>;
}
