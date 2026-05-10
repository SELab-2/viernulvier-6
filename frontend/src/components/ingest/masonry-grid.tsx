"use client";

import { ReactNode } from "react";

export type ColumnCount = 2 | 3 | 4 | 5 | 6;

interface MasonryGridProps {
    children: ReactNode;
    columns?: ColumnCount;
}

/**
 * Masonry layout using CSS columns.
 *
 * Items flow top-to-bottom per column, creating a Pinterest-style
 * masonry effect when cards have varying heights.
 *
 * The `columns` prop sets the max column count on large screens.
 */
export function MasonryGrid({ children, columns = 4 }: MasonryGridProps) {
    const max = Math.min(Math.max(columns, 2), 6);
    return (
        <div
            className={`columns-1 gap-3 sm:columns-2 md:columns-3 lg:columns-4 ${max >= 5 ? "xl:columns-5" : ""} ${max === 6 ? "2xl:columns-6" : ""}`}
        >
            {children}
        </div>
    );
}
