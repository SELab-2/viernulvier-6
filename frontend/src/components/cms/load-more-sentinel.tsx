"use client";

import { useCallback, useEffect, useRef } from "react";
import { Spinner } from "@/components/ui/spinner";

interface LoadMoreSentinelProps {
    hasNextPage: boolean;
    onLoadMore: () => void;
}

function findScrollParent(el: Element): Element | null {
    let parent = el.parentElement;
    while (parent) {
        const { overflowY } = getComputedStyle(parent);
        if (overflowY === "auto" || overflowY === "scroll") return parent;
        parent = parent.parentElement;
    }
    return null;
}

export function LoadMoreSentinel({ hasNextPage, onLoadMore }: LoadMoreSentinelProps) {
    const ref = useRef<HTMLDivElement>(null);

    const loadMore = useCallback(() => onLoadMore(), [onLoadMore]);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const root = findScrollParent(el);
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) loadMore();
            },
            { threshold: 0, rootMargin: "400px", root }
        );
        observer.observe(el);
        return () => observer.unobserve(el);
    }, [loadMore]);

    if (!hasNextPage) return null;

    return (
        <div ref={ref} className="flex justify-center py-4">
            <Spinner className="text-muted-foreground h-5 w-5" />
        </div>
    );
}
