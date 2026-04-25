"use client";

import { useEffect, useState } from "react";
import { Media } from "@/types/models/media.types";
import { MediaIngestCard } from "./media-ingest-card";

const SM_BREAKPOINT = 640;
const LG_BREAKPOINT = 1024;

interface MediaMasonryGridProps {
    items: Media[];
    onView: (media: Media, index: number) => void;
    onEdit: (media: Media) => void;
    onDelete: (media: Media) => void;
}

/**
 * Distributes items into `cols` buckets so that rendering each bucket
 * top-to-bottom produces a natural left-to-right reading order.
 */
function splitIntoColumns<T>(items: T[], cols: number): T[][] {
    const rows = Math.ceil(items.length / cols);
    return Array.from({ length: cols }, (_, col) =>
        Array.from({ length: rows }, (_, row) => items[row * cols + col]).filter(Boolean)
    ) as T[][];
}

function useColumnCount() {
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

export function MediaMasonryGrid({ items, onView, onEdit, onDelete }: MediaMasonryGridProps) {
    const columnCount = useColumnCount();
    const columns = columnCount === 1 ? [items] : splitIntoColumns(items, columnCount);

    return (
        <div className="flex items-start gap-4">
            {columns.map((col, ci) => (
                <div key={ci} className="flex flex-1 flex-col gap-4">
                    {col.map((media) => (
                        <MediaIngestCard
                            key={media.id}
                            media={media}
                            onView={() => onView(media, items.indexOf(media))}
                            onEdit={() => onEdit(media)}
                            onDelete={() => onDelete(media)}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}
