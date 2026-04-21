// frontend/src/components/collections/CollectionItemCard.tsx
"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

import { CollectionItem, CollectionContentType } from "@/types/models/collection.types";
import { useGetProduction } from "@/hooks/api/useProductions";
import { useGetLocation } from "@/hooks/api/useLocations";
import { useGetArticle } from "@/hooks/api/useArticles";
import { useGetArtist } from "@/hooks/api/useArtists";
import { useGetMedia, useGetEntityMedia } from "@/hooks/api/useMedia";

// ---------------------------------------------------------------------------
// Entity-specific sub-components — each calls exactly one hook family
// ---------------------------------------------------------------------------

function ProductionCard({ item, locale }: { item: CollectionItem; locale: string }) {
    const t = useTranslations("Collections");
    const { data: production, isLoading } = useGetProduction(item.contentId);
    const title =
        production?.translations.find((tr) => tr.languageCode === locale)?.title ??
        production?.translations[0]?.title ??
        null;
    const imageUrl = production?.coverImageUrl ?? null;
    const href = production ? `/productions/${production.id}` : null;

    return (
        <CardShell
            item={item}
            locale={locale}
            isLoading={isLoading}
            title={title}
            imageUrl={imageUrl}
            href={href}
            typeLabel={t("typeLabels.production")}
        />
    );
}

function LocationCard({ item, locale }: { item: CollectionItem; locale: string }) {
    const t = useTranslations("Collections");
    const { data: location, isLoading } = useGetLocation(item.contentId);
    const title = location?.name ?? null;
    const imageUrl = location?.coverImageUrl ?? null;
    const href = location?.slug ? `/locations/${location.slug}` : null;

    return (
        <CardShell
            item={item}
            locale={locale}
            isLoading={isLoading}
            title={title}
            imageUrl={imageUrl}
            href={href}
            typeLabel={t("typeLabels.location")}
        />
    );
}

function BlogpostCard({ item, locale }: { item: CollectionItem; locale: string }) {
    const t = useTranslations("Collections");
    const { data: article, isLoading } = useGetArticle(item.contentId);
    const title = article?.title ?? null;
    const imageUrl = article?.coverImageUrl ?? null;
    const href = article?.slug ? `/articles/${article.slug}` : null;

    return (
        <CardShell
            item={item}
            locale={locale}
            isLoading={isLoading}
            title={title}
            imageUrl={imageUrl}
            href={href}
            typeLabel={t("typeLabels.blogpost")}
        />
    );
}

function ArtistCard({ item, locale }: { item: CollectionItem; locale: string }) {
    const t = useTranslations("Collections");

    const { data: artist, isLoading } = useGetArtist(item.contentId);
    const title = artist?.name ?? null;
    const href = artist ? `/artists/${artist.id}` : null;

    const imageUrl = artist?.coverImageUrl ?? null;

    return (
        <CardShell
            item={item}
            locale={locale}
            isLoading={isLoading}
            title={title}
            imageUrl={imageUrl}
            href={href}
            typeLabel={t("typeLabels.artist")}
        />
    );
}

function MediaCard({ item, locale }: { item: CollectionItem; locale: string }) {
    const t = useTranslations("Collections");
    const { data: media, isLoading } = useGetMedia(item.contentId);
    const imageUrl = media?.url ?? null;
    const title =
        (locale === "nl" ? media?.altTextNl : (media?.altTextEn ?? media?.altTextNl)) ?? null;

    return (
        <CardShell
            item={item}
            locale={locale}
            isLoading={isLoading}
            title={title}
            imageUrl={imageUrl}
            href={null}
            typeLabel={t("typeLabels.media")}
        />
    );
}

// ---------------------------------------------------------------------------
// Shared card shell — renders the newspaper-column layout
// ---------------------------------------------------------------------------

const ASPECT_CLASSES = ["aspect-[4/3]", "aspect-[3/4]"] as const;

interface CardShellProps {
    item: CollectionItem;
    locale: string;
    isLoading: boolean;
    title: string | null;
    imageUrl: string | null;
    href: string | null;
    typeLabel: string;
}

function CardShell({ item, locale, isLoading, title, imageUrl, href, typeLabel }: CardShellProps) {
    const comment =
        item.translations.find((tr) => tr.languageCode === locale)?.comment ??
        item.translations[0]?.comment ??
        null;

    const inner = (
        <div className="border-foreground/20 hover:bg-muted/5 border transition-colors">
            {/* Type kicker */}
            <div className="border-foreground/10 border-b px-3 pt-2 pb-1.5">
                <span className="text-muted-foreground font-mono text-[8px] tracking-[2px] uppercase">
                    {typeLabel}
                </span>
            </div>

            {/* Image slot — aspect ratio alternates per position to create height variety within each column */}
            <div
                className={`relative w-full overflow-hidden ${item.position % 2 === 0 ? ASPECT_CLASSES[0] : ASPECT_CLASSES[1]}`}
            >
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
                    <div className="h-full w-full bg-gradient-to-br from-[#CCC6BC] to-[#B5AEA4]" />
                )}
            </div>

            {/* Title */}
            <div className="px-3 pt-3">
                {isLoading ? (
                    <div className="bg-muted/20 mb-1 h-5 w-3/4 animate-pulse rounded-none" />
                ) : (
                    <h2 className="font-display text-foreground text-[18px] leading-[1.15] font-bold tracking-[-0.02em]">
                        {title ?? "—"}
                    </h2>
                )}
            </div>

            {/* Curator comment */}
            {comment && (
                <>
                    <div className="border-foreground/10 mx-3 mt-3 border-t" />
                    <p className="text-muted-foreground px-3 pt-2 pb-3 font-mono text-[11px] leading-snug italic">
                        {comment}
                    </p>
                </>
            )}
            {!comment && <div className="pb-3" />}
        </div>
    );

    if (href) {
        return <Link href={href as string}>{inner}</Link>;
    }
    return inner;
}

// ---------------------------------------------------------------------------
// Dispatch map — events intentionally excluded (not shown on collection pages)
// ---------------------------------------------------------------------------

const CARD_COMPONENTS: Partial<
    Record<CollectionContentType, React.ComponentType<{ item: CollectionItem; locale: string }>>
> = {
    production: ProductionCard,
    location: LocationCard,
    blogpost: BlogpostCard,
    artist: ArtistCard,
    media: MediaCard,
};

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

interface CollectionItemCardProps {
    item: CollectionItem;
    locale: string;
}

export function CollectionItemCard({ item, locale }: CollectionItemCardProps) {
    const Card = CARD_COMPONENTS[item.contentType];
    if (!Card) return null;
    return <Card item={item} locale={locale} />;
}
