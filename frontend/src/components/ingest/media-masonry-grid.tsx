"use client";

import { useEffect, useState } from "react";
import { Media } from "@/types/models/media.types";
import { MediaIngestCard } from "./media-ingest-card";

const SM_BREAKPOINT = 640;
const MD_BREAKPOINT = 1024;
const LG_BREAKPOINT = 1440;

interface MediaMasonryGridProps {
    items: Media[];
    onView: (media: Media, index: number) => void;
    onEdit: (media: Media) => void;
    onDelete: (media: Media) => void;
}

function splitIntoColumns<T>(items: T[], cols: number): T[][] {
    const columns: T[][] = Array.from({ length: cols }, () => []);
    items.forEach((item, i) => {
        columns[i % cols].push(item);
    });
    return columns;
}

function useColumnCount() {
    const [width, setWidth] = useState(() =>
        typeof window !== "undefined" ? window.innerWidth : MD_BREAKPOINT
    );

    useEffect(() => {
        const onResize = () => setWidth(window.innerWidth);
        onResize();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    if (width < SM_BREAKPOINT) return 2;
    if (width < MD_BREAKPOINT) return 3;
    if (width < LG_BREAKPOINT) return 4;
    return 5;
}

export function MediaMasonryGrid({ items, onView, onEdit, onDelete }: MediaMasonryGridProps) {
    const columnCount = useColumnCount();
    const columns = splitIntoColumns(items, columnCount);

    return (
        <div className="flex items-start gap-2">
            {columns.map((col, ci) => (
                <div key={ci} className="flex flex-1 flex-col gap-2">
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
