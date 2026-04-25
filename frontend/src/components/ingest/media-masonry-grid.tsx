"use client";

import { Media } from "@/types/models/media.types";
import { MediaIngestCard } from "./media-ingest-card";

interface MediaMasonryGridProps {
    items: Media[];
    onView: (media: Media, index: number) => void;
    onEdit: (media: Media) => void;
    onDelete: (media: Media) => void;
}

export function MediaMasonryGrid({ items, onView, onEdit, onDelete }: MediaMasonryGridProps) {
    return (
        <div className="columns-2 gap-2 md:columns-3 lg:columns-4 xl:columns-5">
            {items.map((media, index) => (
                <div key={media.id} className="mb-2 break-inside-avoid">
                    <MediaIngestCard
                        media={media}
                        onView={() => onView(media, index)}
                        onEdit={() => onEdit(media)}
                        onDelete={() => onDelete(media)}
                    />
                </div>
            ))}
        </div>
    );
}
