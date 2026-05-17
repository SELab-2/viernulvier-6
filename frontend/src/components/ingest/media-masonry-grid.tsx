"use client";

import { Media } from "@/types/models/media.types";
import { MediaIngestCard } from "./media-ingest-card";

interface MediaMasonryGridProps {
    items: Media[];
    onView: (m: Media) => void;
    onEdit: (m: Media) => void;
    onDelete: (m: Media) => void;
}

export function MediaMasonryGrid({ items, onView, onEdit, onDelete }: MediaMasonryGridProps) {
    return (
        <div className="columns-2 gap-2 sm:columns-3 lg:columns-4">
            {items.map((media) => (
                <div key={media.id} className="mb-2 break-inside-avoid">
                    <MediaIngestCard
                        media={media}
                        onView={() => onView(media)}
                        onEdit={() => onEdit(media)}
                        onDelete={() => onDelete(media)}
                    />
                </div>
            ))}
        </div>
    );
}
