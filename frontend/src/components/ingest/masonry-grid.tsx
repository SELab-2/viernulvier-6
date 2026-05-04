"use client";

import { ReactNode } from "react";
import { UniformCardsContext } from "@/components/collections/CollectionItemCard";

interface MasonryGridProps {
    children: ReactNode;
}

/**
 * Generic responsive masonry layout using CSS columns.
 *
 * Columns: 1 (mobile) → 2 (sm+) → 3 (lg+)
 *
 * On mobile we force uniform aspect ratios via UniformCardsContext
to avoid ragged column breaks caused by wildly varying heights.
 */
export function MasonryGrid({ children }: MasonryGridProps) {
    return (
        <UniformCardsContext.Provider value={true}>
            <div className="columns-1 gap-3 sm:columns-2 lg:columns-3">{children}</div>
        </UniformCardsContext.Provider>
    );
}
