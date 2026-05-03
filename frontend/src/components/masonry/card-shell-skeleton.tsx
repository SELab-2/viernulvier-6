"use client";

import { useContext } from "react";
import { UniformCardsContext } from "./masonry-grid";

const ASPECT_CLASSES = ["aspect-[4/3]", "aspect-[3/4]"] as const;

export interface CardShellSkeletonProps {
    index: number;
    showComment?: boolean;
}

export function CardShellSkeleton({ index, showComment = false }: CardShellSkeletonProps) {
    const uniform = useContext(UniformCardsContext);
    const aspectClass = uniform ? ASPECT_CLASSES[0] : ASPECT_CLASSES[index % 2];

    return (
        <div
            className="border-foreground/20 border"
            role="status"
            aria-label="Loading"
            aria-busy="true"
        >
            <div className="border-foreground/10 border-b px-3 pt-2 pb-1.5">
                <div className="bg-muted/20 h-2 w-16 animate-pulse" />
            </div>

            <div className={`relative w-full overflow-hidden ${aspectClass}`}>
                <div className="bg-muted/10 h-full w-full animate-pulse" />
            </div>

            <div className="px-3 pt-3">
                <div className="bg-muted/20 mb-1 h-5 w-3/4 animate-pulse" />
            </div>

            {showComment ? (
                <>
                    <div className="border-foreground/10 mx-3 mt-3 border-t" />
                    <div className="px-3 pt-2 pb-3">
                        <div className="bg-muted/15 h-3 w-5/6 animate-pulse" />
                    </div>
                </>
            ) : (
                <div className="pb-3" />
            )}
        </div>
    );
}
