"use client";

import { useMemo } from "react";

import { MasonryGrid } from "./masonry-grid";
import { CardShellSkeleton } from "./card-shell-skeleton";

interface MasonryGridSkeletonProps {
    count?: number;
}

export function MasonryGridSkeleton({ count = 6 }: MasonryGridSkeletonProps) {
    const items = useMemo(
        () => Array.from({ length: count }, (_, i) => ({ id: `skeleton-${i}` })),
        [count]
    );

    return (
        <MasonryGrid
            items={items}
            renderItem={(_item, index) => <CardShellSkeleton index={index} />}
        />
    );
}
