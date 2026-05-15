"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";

interface LoadMoreSentinelProps {
    hasNextPage: boolean;
    onLoadMore: () => void;
}

function findScrollParent(el: Element): HTMLElement | null {
    let parent = el.parentElement;
    while (parent) {
        const { overflowY } = getComputedStyle(parent);
        if (overflowY === "auto" || overflowY === "scroll") return parent as HTMLElement;
        parent = parent.parentElement;
    }
    return null;
}

export function LoadMoreSentinel({ hasNextPage, onLoadMore }: LoadMoreSentinelProps) {
    const ref = useRef<HTMLDivElement>(null);
    const onLoadMoreRef = useRef(onLoadMore);
    useLayoutEffect(() => {
        onLoadMoreRef.current = onLoadMore;
    });

    useEffect(() => {
        if (!hasNextPage) return;
        const el = ref.current;
        if (!el) return;
        const container = findScrollParent(el);
        if (!container) return;

        const check = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            // Prefetch when within 5 viewport heights of the bottom so fast
            // scrolling never outruns the data pipeline.
            if (scrollHeight - scrollTop - clientHeight < clientHeight * 5) {
                onLoadMoreRef.current();
            }
        };

        check();
        container.addEventListener("scroll", check, { passive: true });
        return () => container.removeEventListener("scroll", check);
    }, [hasNextPage]);

    if (!hasNextPage) return null;

    return (
        <div ref={ref} className="flex justify-center py-4">
            <Spinner className="text-muted-foreground h-5 w-5" />
        </div>
    );
}
