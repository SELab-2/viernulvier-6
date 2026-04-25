"use client";

import Masonry from "react-masonry-css";
import { Media } from "@/types/models/media.types";
import { MediaIngestCard } from "./media-ingest-card";

const breakpointColumns = {
    default: 5,
    1280: 5,
    1024: 4,
    768: 3,
    640: 2,
};

export function MediaMasonryGrid({
    items,
    onView,
    onEdit,
    onDelete,
}: {
    items: Media[];
    onView: (m: Media) => void;
    onEdit: (m: Media) => void;
    onDelete: (m: Media) => void;
}) {
    return (
        <Masonry breakpointCols={breakpointColumns} className="flex w-auto" columnClassName="pl-2">
            {items.map((media) => (
                <div key={media.id} className="mb-2">
                    <MediaIngestCard
                        media={media}
                        onView={() => onView(media)}
                        onEdit={() => onEdit(media)}
                        onDelete={() => onDelete(media)}
                    />
                </div>
            ))}
        </Masonry>
    );
}
