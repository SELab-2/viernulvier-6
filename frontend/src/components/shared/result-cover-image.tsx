"use client";

import { useState } from "react";
import Image from "next/image";
import { useGetEntityMedia } from "@/hooks/api/useMedia";
import { ImagePlaceholder } from "@/components/shared/image-placeholder";

type EntityType = "production" | "article" | "artist" | "location" | "collection";

interface ResultCoverImageProps {
    entityType: EntityType;
    entityId: string;
    coverImageUrl: string | null | undefined;
    alt: string;
    sizes: string;
    wrapperClassName: string;
    imageClassName?: string;
    placeholderId?: string;
    placeholderClassName?: string;
}

export function ResultCoverImage({
    entityType,
    entityId,
    coverImageUrl,
    alt,
    sizes,
    wrapperClassName,
    imageClassName = "object-cover",
    placeholderId,
    placeholderClassName = "absolute inset-0",
}: ResultCoverImageProps) {
    const [coverFailed, setCoverFailed] = useState(false);
    const useFallback = !coverImageUrl || coverFailed;

    const { data: media } = useGetEntityMedia(entityType, entityId, {
        enabled: useFallback,
    });

    const fallbackUrl = useFallback
        ? (media?.find((m) => m.url && m.url !== coverImageUrl)?.url ?? null)
        : null;

    const src = useFallback ? fallbackUrl : coverImageUrl;

    return (
        <div className={wrapperClassName}>
            {src ? (
                <Image
                    key={src}
                    src={src}
                    alt={alt}
                    fill
                    className={imageClassName}
                    sizes={sizes}
                    onError={() => {
                        if (!coverFailed) setCoverFailed(true);
                    }}
                />
            ) : (
                <ImagePlaceholder id={placeholderId} className={placeholderClassName} />
            )}
        </div>
    );
}
