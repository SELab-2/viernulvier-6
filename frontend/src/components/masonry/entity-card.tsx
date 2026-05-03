"use client";

import { useTranslations } from "next-intl";

import { CardShell } from "./card-shell";
import { useGetProduction } from "@/hooks/api/useProductions";
import { useGetLocation } from "@/hooks/api/useLocations";
import { useGetArticle } from "@/hooks/api/useArticles";
import { useGetArtist } from "@/hooks/api/useArtists";
import { useGetMedia } from "@/hooks/api/useMedia";
import type { EntityGridItem, CollectionContentType } from "@/types/models/collection.types";

// ---------------------------------------------------------------------------
// Entity-specific sub-components — each calls exactly one hook family
// ---------------------------------------------------------------------------

function ProductionCard({ item, locale }: { item: EntityGridItem; locale: string }) {
    const t = useTranslations("Collections");
    const { data: production, isLoading } = useGetProduction(item.contentId);
    const title =
        production?.translations.find((tr) => tr.languageCode === locale)?.title ??
        production?.translations[0]?.title ??
        null;

    return (
        <CardShell
            index={item.position}
            isLoading={isLoading}
            title={title}
            imageUrl={production?.coverImageUrl ?? null}
            href={production ? `/productions/${production.id}` : null}
            typeLabel={t("typeLabels.production")}
            comment={item.comment}
        />
    );
}

function LocationCard({ item }: { item: EntityGridItem; locale: string }) {
    const t = useTranslations("Collections");
    const { data: location, isLoading } = useGetLocation(item.contentId);

    return (
        <CardShell
            index={item.position}
            isLoading={isLoading}
            title={location?.name ?? null}
            imageUrl={location?.coverImageUrl ?? null}
            href={location?.slug ? `/locations/${location.slug}` : null}
            typeLabel={t("typeLabels.location")}
            comment={item.comment}
        />
    );
}

function BlogpostCard({ item }: { item: EntityGridItem; locale: string }) {
    const t = useTranslations("Collections");
    const { data: article, isLoading } = useGetArticle(item.contentId);

    return (
        <CardShell
            index={item.position}
            isLoading={isLoading}
            title={article?.title ?? null}
            imageUrl={article?.coverImageUrl ?? null}
            href={article?.slug ? `/articles/${article.slug}` : null}
            typeLabel={t("typeLabels.blogpost")}
            comment={item.comment}
        />
    );
}

function ArtistCard({ item }: { item: EntityGridItem; locale: string }) {
    const t = useTranslations("Collections");
    const { data: artist, isLoading } = useGetArtist(item.contentId);

    return (
        <CardShell
            index={item.position}
            isLoading={isLoading}
            title={artist?.name ?? null}
            imageUrl={artist?.coverImageUrl ?? null}
            href={artist ? `/artists/${artist.id}` : null}
            typeLabel={t("typeLabels.artist")}
            comment={item.comment}
        />
    );
}

function MediaCard({ item, locale }: { item: EntityGridItem; locale: string }) {
    const t = useTranslations("Collections");
    const { data: media, isLoading } = useGetMedia(item.contentId);
    const title =
        (locale === "nl" ? media?.altTextNl : (media?.altTextEn ?? media?.altTextNl)) ?? null;

    return (
        <CardShell
            index={item.position}
            isLoading={isLoading}
            title={title}
            imageUrl={media?.url ?? null}
            href={null}
            typeLabel={t("typeLabels.media")}
            comment={item.comment}
        />
    );
}

// ---------------------------------------------------------------------------
// Dispatch map — events intentionally excluded
// ---------------------------------------------------------------------------

const CARD_COMPONENTS: Partial<
    Record<CollectionContentType, React.ComponentType<{ item: EntityGridItem; locale: string }>>
> = {
    production: ProductionCard,
    location: LocationCard,
    blogpost: BlogpostCard,
    artist: ArtistCard,
    media: MediaCard,
};

export function EntityCard({ item, locale }: { item: EntityGridItem; locale: string }) {
    const Card = CARD_COMPONENTS[item.contentType];
    if (!Card) return null;
    return <Card item={item} locale={locale} />;
}
