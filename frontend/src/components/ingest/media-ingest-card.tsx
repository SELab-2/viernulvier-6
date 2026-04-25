"use client";

import Image from "next/image";
import { Pencil, Trash2, ImageIcon } from "lucide-react";
import { Media } from "@/types/models/media.types";
import { resolveLocalized } from "@/components/ui/localized-text";

interface MediaIngestCardProps {
    media: Media;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

function thumbnailUrl(media: Media): string | null {
    const crop = media.crops.find((c) => c.variantKind === "thumbnail");
    return crop?.url ?? media.url ?? null;
}

export function MediaIngestCard({ media, onView, onEdit, onDelete }: MediaIngestCardProps) {
    const url = thumbnailUrl(media);
    const alt = resolveLocalized(media.altTextNl ?? "", media.altTextEn ?? "").value;

    const naturalAspect =
        media.width && media.height && media.height > 0 ? media.width / media.height : 1;

    const fileName = media.s3Key.split("/").pop() ?? media.id;
    const fileExt = media.mimeType.split("/").pop();
    const dimensions = media.width && media.height ? `${media.width}×${media.height}` : null;

    return (
        <div
            className="border-foreground/20 hover:border-foreground/40 group relative border transition-colors"
            style={{ contentVisibility: "auto", containIntrinsicSize: "0 250px" }}
        >
            {/* Image — clickable to open spotlight (production page pattern) */}
            <button
                type="button"
                onClick={onView}
                className="relative block w-full cursor-zoom-in overflow-hidden"
                style={{ aspectRatio: naturalAspect }}
            >
                {url ? (
                    <Image
                        src={url}
                        alt={alt}
                        fill
                        loading="lazy"
                        decoding="async"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    />
                ) : (
                    <div className="bg-muted flex h-full w-full items-center justify-center">
                        <ImageIcon className="text-muted-foreground h-5 w-5" />
                    </div>
                )}
            </button>

            {/* Info bar + actions */}
            <div className="border-foreground/10 flex items-center justify-between border-t px-2 py-1.5">
                <div className="min-w-0 flex-1">
                    <div className="text-foreground font-body truncate text-[10px] leading-tight">
                        {fileName}
                    </div>
                    <div className="text-muted-foreground mt-0.5 flex gap-1.5 font-mono text-[8px] tracking-wider uppercase">
                        <span>{fileExt}</span>
                        {dimensions && <span>{dimensions}</span>}
                    </div>
                </div>
                <div className="ml-2 flex items-center gap-1">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit();
                        }}
                        className="text-muted-foreground hover:text-foreground flex h-6 w-6 items-center justify-center transition-colors"
                        aria-label="Edit"
                    >
                        <Pencil className="h-3 w-3" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="text-muted-foreground hover:text-destructive flex h-6 w-6 items-center justify-center transition-colors"
                        aria-label="Delete"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                </div>
            </div>
        </div>
    );
}
