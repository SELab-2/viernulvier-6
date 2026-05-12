"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";
import { useGetProduction } from "@/hooks/api/useProductions";
import { useGetLocation } from "@/hooks/api/useLocations";
import { useGetArticle } from "@/hooks/api/useArticles";
import { useGetArtist } from "@/hooks/api/useArtists";
import { useGetMedia } from "@/hooks/api/useMedia";
import type { CollectionContentType, EntityGridItem } from "@/types/models/collection.types";

interface ListShellProps {
    isLoading: boolean;
    title: string | null;
    imageUrl: string | null;
    href: string | null;
    typeLabel: string;
    comment?: string | null;
}

function ListShell({ isLoading, title, imageUrl, href, typeLabel, comment }: ListShellProps) {
    const inner = (
        <div className="border-foreground/20 hover:bg-muted/5 flex border transition-colors">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden">
                {isLoading ? (
                    <div className="bg-muted/10 h-full w-full animate-pulse" />
                ) : imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={title ?? ""}
                        fill
                        className="object-cover"
                        sizes="80px"
                    />
                ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[#CCC6BC] to-[#B5AEA4]" />
                )}
            </div>
            <div className="border-foreground/20 flex flex-col justify-center gap-1 border-l px-3 py-2">
                <span className="text-muted-foreground font-mono text-[8px] tracking-[2px] uppercase">
                    {typeLabel}
                </span>
                {isLoading ? (
                    <div className="bg-muted/20 h-5 w-40 animate-pulse rounded-none" />
                ) : (
                    <span className="font-display text-foreground text-sm leading-tight font-bold">
                        {title ?? "—"}
                    </span>
                )}
                {comment && (
                    <p className="text-muted-foreground font-mono text-[11px] leading-snug italic">
                        {comment}
                    </p>
                )}
            </div>
        </div>
    );

    if (href) {
        return <Link href={href}>{inner}</Link>;
    }
    return inner;
}

function ProductionListItem({ item, locale }: { item: EntityGridItem; locale: string }) {
    const t = useTranslations("Collections");
    const { data: production, isLoading } = useGetProduction(item.contentId);
    const title =
        production?.translations.find((tr) => tr.languageCode === locale)?.title ??
        production?.translations[0]?.title ??
        null;

    return (
        <ListShell
            isLoading={isLoading}
            title={title}
            imageUrl={production?.coverImageUrl ?? null}
            href={production ? `/productions/${production.id}` : null}
            typeLabel={t("typeLabels.production")}
            comment={item.comment}
        />
    );
}

function LocationListItem({ item }: { item: EntityGridItem; locale: string }) {
    const t = useTranslations("Collections");
    const { data: location, isLoading } = useGetLocation(item.contentId);

    return (
        <ListShell
            isLoading={isLoading}
            title={location?.name ?? null}
            imageUrl={location?.coverImageUrl ?? null}
            href={location?.slug ? `/locations/${location.slug}` : null}
            typeLabel={t("typeLabels.location")}
            comment={item.comment}
        />
    );
}

function BlogpostListItem({ item }: { item: EntityGridItem; locale: string }) {
    const t = useTranslations("Collections");
    const { data: article, isLoading } = useGetArticle(item.contentId);

    return (
        <ListShell
            isLoading={isLoading}
            title={article?.title ?? null}
            imageUrl={article?.coverImageUrl ?? null}
            href={article?.slug ? `/articles/${article.slug}` : null}
            typeLabel={t("typeLabels.blogpost")}
            comment={item.comment}
        />
    );
}

function ArtistListItem({ item }: { item: EntityGridItem; locale: string }) {
    const t = useTranslations("Collections");
    const { data: artist, isLoading } = useGetArtist(item.contentId);

    return (
        <ListShell
            isLoading={isLoading}
            title={artist?.name ?? null}
            imageUrl={artist?.coverImageUrl ?? null}
            href={artist ? `/artists/${artist.id}` : null}
            typeLabel={t("typeLabels.artist")}
            comment={item.comment}
        />
    );
}

function MediaListItem({ item, locale }: { item: EntityGridItem; locale: string }) {
    const t = useTranslations("Collections");
    const { data: media, isLoading } = useGetMedia(item.contentId);
    const title =
        (locale === "nl" ? media?.altTextNl : (media?.altTextEn ?? media?.altTextNl)) ?? null;

    return (
        <ListShell
            isLoading={isLoading}
            title={title}
            imageUrl={media?.url ?? null}
            href={null}
            typeLabel={t("typeLabels.media")}
            comment={item.comment}
        />
    );
}

const LIST_ITEM_COMPONENTS: Partial<
    Record<CollectionContentType, React.ComponentType<{ item: EntityGridItem; locale: string }>>
> = {
    production: ProductionListItem,
    location: LocationListItem,
    blogpost: BlogpostListItem,
    artist: ArtistListItem,
    media: MediaListItem,
};

export function EntityListItem({ item, locale }: { item: EntityGridItem; locale: string }) {
    const Item = LIST_ITEM_COMPONENTS[item.contentType];
    if (!Item) return null;
    return <Item item={item} locale={locale} />;
}
