"use client";

import { useContext } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { UniformCardsContext } from "./masonry-grid";
import { EntityTagStrip } from "@/components/shared/entity-tag-strip";
import { ImagePlaceholder } from "@/components/shared/image-placeholder";
import type { EntityTagSlim } from "@/types/models/taxonomy.types";
import { ResultImagePlaceholder } from "@/components/searchpage/result-image-placeholder";

const ASPECT_CLASSES = ["aspect-[4/3]", "aspect-[3/4]"] as const;

export interface CardShellProps {
    index: number;
    isLoading: boolean;
    title: string | null;
    imageUrl: string | null;
    href: string | null;
    typeLabel: string;
    subtitle?: string | null;
    description?: string | null;
    tags?: EntityTagSlim[];
    locale?: string;
    comment?: string | null;
}

export function CardShell({
    index,
    isLoading,
    title,
    imageUrl,
    href,
    typeLabel,
    subtitle,
    description,
    tags = [],
    locale,
    comment,
}: CardShellProps) {
    const uniform = useContext(UniformCardsContext);
    const aspectClass = uniform ? ASPECT_CLASSES[0] : ASPECT_CLASSES[index % 2];

    const inner = (
        <div className="border-foreground/20 hover:bg-muted/5 border transition-colors">
            <div className="border-foreground/10 border-b px-3 pt-2 pb-1.5">
                <span className="text-muted-foreground font-mono text-[8px] tracking-[2px] uppercase">
                    {typeLabel}
                </span>
            </div>

            <div className={`bg-muted relative w-full overflow-hidden ${aspectClass}`}>
                {isLoading ? (
                    <div className="bg-muted/10 h-full w-full animate-pulse" />
                ) : imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={title ?? ""}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                ) : (
                    <ResultImagePlaceholder id={index.toString()} />
                )}
            </div>

            <div className="px-3 pt-3">
                {isLoading ? (
                    <div className="bg-muted/20 mb-1 h-5 w-3/4 animate-pulse rounded-none" />
                ) : (
                    <>
                        <h2 className="font-display text-foreground text-[18px] leading-[1.15] font-bold tracking-[-0.02em]">
                            {title ?? "—"}
                        </h2>
                        {subtitle && (
                            <p className="text-muted-foreground font-display mt-1 text-[15px] leading-tight font-bold tracking-[-0.01em] italic">
                                {subtitle}
                            </p>
                        )}
                        {description && (
                            <p className="text-muted-foreground mt-2 line-clamp-3 text-sm leading-snug">
                                {description}
                            </p>
                        )}
                    </>
                )}
            </div>

            {tags.length > 0 && locale ? (
                <div className="px-3 pt-3">
                    <EntityTagStrip
                        tags={tags}
                        locale={locale}
                        cap={3}
                        variant="compact"
                        interactive={false}
                    />
                </div>
            ) : null}

            {comment ? (
                <>
                    <div className="border-foreground/10 mx-3 mt-3 border-t" />
                    <p className="text-muted-foreground px-3 pt-2 pb-3 font-mono text-[11px] leading-snug break-words italic">
                        {comment}
                    </p>
                </>
            ) : (
                <div className="pb-3" />
            )}
        </div>
    );

    if (href) {
        return <Link href={href}>{inner}</Link>;
    }

    return inner;
}
