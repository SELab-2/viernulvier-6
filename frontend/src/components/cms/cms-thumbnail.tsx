"use client";

import Image from "next/image";
import { ImagePlaceholder } from "@/components/shared/image-placeholder";

type CmsThumbnailProps = {
    src: string | null | undefined;
    alt: string;
    size?: 40 | 48;
    onClick?: () => void;
};

export function CmsThumbnail({ src, alt, size = 40, onClick }: CmsThumbnailProps) {
    const dimension = size === 48 ? "h-12 w-12" : "h-10 w-10";
    const content = (
        <div className={`bg-muted relative overflow-hidden ${dimension}`}>
            {src ? (
                <Image src={src} alt={alt} fill className="object-cover" sizes={`${size}px`} />
            ) : (
                <ImagePlaceholder className="h-full w-full" />
            )}
        </div>
    );

    if (!onClick || !src) {
        return content;
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className={`block ${dimension} cursor-zoom-in`}
            aria-label={alt}
        >
            {content}
        </button>
    );
}
