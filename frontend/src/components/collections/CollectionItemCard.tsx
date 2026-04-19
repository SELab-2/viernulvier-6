// frontend/src/components/collections/CollectionItemCard.tsx
"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

import { CollectionItem, CollectionContentType } from "@/types/models/collection.types";
import { useGetProduction } from "@/hooks/api/useProductions";
import { useGetEvent } from "@/hooks/api/useEvents";
import { useGetLocation } from "@/hooks/api/useLocations";
import { useGetArticle } from "@/hooks/api/useArticles";
import { useGetArtist } from "@/hooks/api/useArtists";
import { useGetMedia, useGetEntityMedia } from "@/hooks/api/useMedia";

// ---------------------------------------------------------------------------
// Entity-specific sub-components — each calls exactly one hook family
// ---------------------------------------------------------------------------

function ProductionCard({ item, locale }: { item: CollectionItem; locale: string }) {
    const { data: production, isLoading } = useGetProduction(item.contentId);
    const title =
        production?.translations.find((t) => t.languageCode === locale)?.title ??
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
            typeLabel="PRODUCTIE / PRODUCTION"
        />
    );
}

function EventCard({ item, locale }: { item: CollectionItem; locale: string }) {
    const { data: event, isLoading } = useGetEvent(item.contentId);
    // Events have no own title — display the start date and link to the production
    const title = event
        ? new Date(event.startsAt).toLocaleDateString(locale === "en" ? "en-GB" : "nl-BE", {
              day: "numeric",
              month: "long",
              year: "numeric",
          })
        : null;
    const { data: coverMedia = [] } = useGetEntityMedia("event", item.contentId, {
        enabled: !!event,
        params: { role: "cover" },
    });
    const imageUrl = coverMedia[0]?.url ?? null;
    // Link to the production that owns this event
    const href = event ? `/productions/${event.productionId}` : null;

    return (
        <CardShell
            item={item}
            locale={locale}
            isLoading={isLoading}
            title={title}
            imageUrl={imageUrl}
            href={href}
            typeLabel="EVENEMENT / EVENT"
        />
    );
}

function LocationCard({ item, locale }: { item: CollectionItem; locale: string }) {
    const { data: location, isLoading } = useGetLocation(item.contentId);
    const title = location?.name ?? null;
    const { data: coverMedia = [] } = useGetEntityMedia("location", item.contentId, {
        enabled: !!location,
        params: { role: "cover" },
    });
    const imageUrl = coverMedia[0]?.url ?? null;
    const href = location?.slug ? `/locations/${location.slug}` : null;

    return (
        <CardShell
            item={item}
            locale={locale}
            isLoading={isLoading}
            title={title}
            imageUrl={imageUrl}
            href={href}
            typeLabel="LOCATIE / LOCATION"
        />
    );
}

function BlogpostCard({ item, locale }: { item: CollectionItem; locale: string }) {
    const { data: article, isLoading } = useGetArticle(item.contentId);
    const title = article?.title ?? null;
    const { data: coverMedia = [] } = useGetEntityMedia("article", item.contentId, {
        enabled: !!article,
        params: { role: "cover" },
    });
    const imageUrl = coverMedia[0]?.url ?? null;
    const href = article?.slug ? `/articles/${article.slug}` : null;

    return (
        <CardShell
            item={item}
            locale={locale}
            isLoading={isLoading}
            title={title}
            imageUrl={imageUrl}
            href={href}
            typeLabel="ARTIKEL / ARTICLE"
        />
    );
}

function ArtistCard({ item, locale }: { item: CollectionItem; locale: string }) {
    // TODO: REPLACE WITH REAL HOOK — useGetArtist(id) is implemented in a separate PR.
    // Once that PR is merged, replace the stub import and this component will show real data.
    const { data: artist, isLoading } = useGetArtist(item.contentId);
    const title = (artist as { name?: string } | undefined)?.name ?? null;
    const { data: coverMedia = [] } = useGetEntityMedia("artist", item.contentId, {
        enabled: !!artist,
        params: { role: "cover" },
    });
    const imageUrl = coverMedia[0]?.url ?? null;

    return (
        <CardShell
            item={item}
            locale={locale}
            isLoading={isLoading}
            title={title}
            imageUrl={imageUrl}
            href={null}
            typeLabel="ARTIEST / ARTIST"
        />
    );
}

function MediaCard({ item, locale }: { item: CollectionItem; locale: string }) {
    const { data: media, isLoading } = useGetMedia(item.contentId);
    const imageUrl = media?.url ?? null;
    const title = null; // media items have no title

    return (
        <CardShell
            item={item}
            locale={locale}
            isLoading={isLoading}
            title={title}
            imageUrl={imageUrl}
            href={null}
            typeLabel="MEDIA"
        />
    );
}

// ---------------------------------------------------------------------------
// Shared card shell — renders the newspaper-column layout
// ---------------------------------------------------------------------------

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
    const t = useTranslations("Collections");

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

            {/* Image slot — always rendered; shows placeholder when no image available.
                This keeps all cards visually balanced in the masonry grid regardless of
                whether the entity has a cover image yet. Swap for real image when available. */}
            <div className="relative aspect-[4/3] w-full overflow-hidden">
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
                    <div className="border-foreground/10 flex h-full w-full items-center justify-center border">
                        <span className="text-muted-foreground/30 font-mono text-[11px] tracking-[2px]">
                            {t("itemImagePlaceholder")}
                        </span>
                    </div>
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
        return <Link href={href as Parameters<typeof Link>[0]["href"]}>{inner}</Link>;
    }
    return inner;
}

// ---------------------------------------------------------------------------
// Dispatch map
// ---------------------------------------------------------------------------

const CARD_COMPONENTS: Record<
    CollectionContentType,
    React.ComponentType<{ item: CollectionItem; locale: string }>
> = {
    production: ProductionCard,
    event: EventCard,
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
    return <Card item={item} locale={locale} />;
}
