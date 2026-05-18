import { describe, expect, it, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "../../../../test/utils/test-utils";
import { NextIntlClientProvider } from "next-intl";

import type { EntityGridItem } from "@/types/models/collection.types";
import type { Production } from "@/types/models/production.types";
import type { Location } from "@/types/models/location.types";
import type { Article } from "@/types/models/article.types";
import type { Artist } from "@/types/models/artist.types";
import type { Media } from "@/types/models/media.types";

vi.mock("@/i18n/routing", () => ({
    Link: ({
        children,
        href,
        ...rest
    }: {
        children: React.ReactNode;
        href: string;
        className?: string;
        onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

vi.mock("@/hooks/api/useProductions", () => ({
    useGetProduction: vi.fn(),
}));

vi.mock("@/hooks/api/useLocations", () => ({
    useGetLocation: vi.fn(),
}));

vi.mock("@/hooks/api/useArticles", () => ({
    useGetArticle: vi.fn(),
}));

vi.mock("@/hooks/api/useArtists", () => ({
    useGetArtist: vi.fn(),
}));

vi.mock("@/hooks/api/useMedia", () => ({
    useGetMedia: vi.fn(),
}));

import { EntityCard } from "@/components/masonry/entity-card";
import { useGetProduction } from "@/hooks/api/useProductions";
import { useGetLocation } from "@/hooks/api/useLocations";
import { useGetArticle } from "@/hooks/api/useArticles";
import { useGetArtist } from "@/hooks/api/useArtists";
import { useGetMedia } from "@/hooks/api/useMedia";

const mockGetProduction = vi.mocked(useGetProduction);
const mockGetLocation = vi.mocked(useGetLocation);
const mockGetArticle = vi.mocked(useGetArticle);
const mockGetArtist = vi.mocked(useGetArtist);
const mockGetMedia = vi.mocked(useGetMedia);

const messages = {
    Collections: {
        typeLabels: {
            production: "Production",
            location: "Location",
            blogpost: "Blogpost",
            artist: "Artist",
            media: "Media",
        },
    },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <NextIntlClientProvider locale="en" messages={messages}>
        {children}
    </NextIntlClientProvider>
);

const makeItem = (overrides: Partial<EntityGridItem> = {}): EntityGridItem => ({
    id: "item-1",
    contentType: "production",
    contentId: "content-1",
    position: 0,
    ...overrides,
});

const mockProduction: Production = {
    id: "content-1",
    slug: "test-prod",
    sourceId: null,
    video1: null,
    video2: null,
    eticketInfo: null,
    uitdatabankTheme: null,
    uitdatabankType: null,
    translations: [
        {
            languageCode: "en",
            title: "Test Production",
            supertitle: null,
            artist: null,
            metaTitle: null,
            metaDescription: null,
            tagline: null,
            teaser: null,
            description: null,
            descriptionExtra: null,
            description2: null,
            quote: null,
            quoteSource: null,
            programme: null,
            info: null,
            descriptionShort: null,
        },
    ],
    coverImageUrl: "https://example.com/cover.jpg",
    locations: [],
    tags: [],
};

const mockLocation: Location = {
    id: "content-1",
    sourceId: null,
    slug: "main-venue",
    name: "Main Venue",
    code: null,
    street: null,
    number: null,
    postalCode: null,
    city: null,
    country: null,
    phone1: null,
    phone2: null,
    isOwnedByViernulvier: false,
    uitdatabankId: null,
    address: "Mainstraat 12, 9000 Gent",
    coverImageUrl: null,
    translations: [],
};

const mockArticle: Article = {
    id: "content-1",
    slug: "test-article",
    status: "published",
    title: "Test Article",
    content: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    publishedAt: null,
    subjectPeriodStart: null,
    subjectPeriodEnd: null,
    coverImageUrl: null,
    tags: [],
};

const mockArtist: Artist = {
    id: "content-1",
    slug: "test-artist",
    name: "Test Artist",
    coverImageUrl: null,
};

const mockMedia: Media = {
    id: "content-1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    url: "https://example.com/media.jpg",
    s3Key: "s3-key",
    mimeType: "image/jpeg",
    fileSize: null,
    width: null,
    height: null,
    checksum: null,
    altTextNl: "NL alt",
    altTextEn: "EN alt",
    altTextFr: null,
    descriptionNl: null,
    descriptionEn: null,
    descriptionFr: null,
    creditNl: null,
    creditEn: null,
    creditFr: null,
    geoLatitude: null,
    geoLongitude: null,
    parentId: null,
    derivativeType: null,
    galleryType: null,
    sourceSystem: "upload",
    sourceUri: null,
    crops: [],
};

describe("EntityCard", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it("renders ProductionCard with title from translation matching locale", () => {
        mockGetProduction.mockReturnValue({
            data: mockProduction,
            isLoading: false,
        } as ReturnType<typeof useGetProduction>);

        render(<EntityCard item={makeItem({ contentType: "production" })} locale="en" />, {
            wrapper,
        });

        expect(screen.getByText("Production")).toBeInTheDocument();
        expect(screen.getByText("Test Production")).toBeInTheDocument();
    });

    it("renders ProductionCard in loading state", () => {
        mockGetProduction.mockReturnValue({
            data: undefined,
            isLoading: true,
        } as ReturnType<typeof useGetProduction>);

        render(<EntityCard item={makeItem({ contentType: "production" })} locale="en" />, {
            wrapper,
        });

        expect(screen.getByText("Production")).toBeInTheDocument();
    });

    it("renders LocationCard with location name", () => {
        mockGetLocation.mockReturnValue({
            data: mockLocation,
            isLoading: false,
        } as ReturnType<typeof useGetLocation>);

        render(<EntityCard item={makeItem({ contentType: "location" })} locale="en" />, {
            wrapper,
        });

        expect(screen.getByText("Location")).toBeInTheDocument();
        expect(screen.getByText("Main Venue")).toBeInTheDocument();
    });

    it("renders BlogpostCard with article title", () => {
        mockGetArticle.mockReturnValue({
            data: mockArticle,
            isLoading: false,
        } as ReturnType<typeof useGetArticle>);

        render(<EntityCard item={makeItem({ contentType: "blogpost" })} locale="en" />, {
            wrapper,
        });

        expect(screen.getByText("Blogpost")).toBeInTheDocument();
        expect(screen.getByText("Test Article")).toBeInTheDocument();
    });

    it("renders ArtistCard with artist name", () => {
        mockGetArtist.mockReturnValue({
            data: mockArtist,
            isLoading: false,
        } as ReturnType<typeof useGetArtist>);

        render(<EntityCard item={makeItem({ contentType: "artist" })} locale="en" />, {
            wrapper,
        });

        expect(screen.getByText("Artist")).toBeInTheDocument();
        expect(screen.getByText("Test Artist")).toBeInTheDocument();
    });

    it("renders MediaCard with altTextEn when locale is en", () => {
        mockGetMedia.mockReturnValue({
            data: mockMedia,
            isLoading: false,
        } as ReturnType<typeof useGetMedia>);

        render(<EntityCard item={makeItem({ contentType: "media" })} locale="en" />, {
            wrapper,
        });

        expect(screen.getByText("Media")).toBeInTheDocument();
        expect(screen.getByText("EN alt")).toBeInTheDocument();
    });

    it("renders MediaCard with altTextNl when locale is nl", () => {
        mockGetMedia.mockReturnValue({
            data: mockMedia,
            isLoading: false,
        } as ReturnType<typeof useGetMedia>);

        render(<EntityCard item={makeItem({ contentType: "media" })} locale="nl" />, {
            wrapper,
        });

        expect(screen.getByText("Media")).toBeInTheDocument();
        expect(screen.getByText("NL alt")).toBeInTheDocument();
    });

    it("renders MediaCard with altTextNl fallback when en locale but no en alt text", () => {
        mockGetMedia.mockReturnValue({
            data: {
                ...mockMedia,
                altTextEn: null,
                altTextNl: "NL fallback",
            },
            isLoading: false,
        } as ReturnType<typeof useGetMedia>);

        render(<EntityCard item={makeItem({ contentType: "media" })} locale="en" />, {
            wrapper,
        });

        expect(screen.getByText("NL fallback")).toBeInTheDocument();
    });

    it("renders comment when item has a comment", () => {
        mockGetProduction.mockReturnValue({
            data: mockProduction,
            isLoading: false,
        } as ReturnType<typeof useGetProduction>);

        render(
            <EntityCard
                item={makeItem({ contentType: "production", comment: "Curator note" })}
                locale="en"
            />,
            { wrapper }
        );

        expect(screen.getByText("Curator note")).toBeInTheDocument();
    });

    it("returns null for unsupported content type (event)", () => {
        const { container } = render(
            <EntityCard item={makeItem({ contentType: "event" })} locale="en" />,
            { wrapper }
        );

        expect(container.firstChild).toBeNull();
    });

    it("shows em-dash when title is null", () => {
        mockGetProduction.mockReturnValue({
            data: { ...mockProduction, translations: [] },
            isLoading: false,
        } as ReturnType<typeof useGetProduction>);

        render(<EntityCard item={makeItem({ contentType: "production" })} locale="en" />, {
            wrapper,
        });

        expect(screen.getByText("\u2014")).toBeInTheDocument();
    });
});
