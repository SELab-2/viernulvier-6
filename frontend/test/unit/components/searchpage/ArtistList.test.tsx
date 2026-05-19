import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "../../../../test/utils/test-utils";
import { NextIntlClientProvider } from "next-intl";

import { ArtistList } from "@/components/searchpage/artist-list/ArtistList";
import type { Artist } from "@/types/models/artist.types";

const messages = {
    Home: {
        loading: "Loading",
    },
    Sidebar: {
        categories: {
            artists: "Artists",
        },
    },
};

vi.mock("@/i18n/routing", () => ({
    Link: ({
        children,
        href,
        ...rest
    }: {
        children: React.ReactNode;
        href: string;
        className?: string;
    }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

const renderWithIntl = (ui: React.ReactElement) =>
    render(
        <NextIntlClientProvider locale="en" messages={messages}>
            {ui}
        </NextIntlClientProvider>
    );

describe("ArtistList", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders the artist cover image and slug metadata when available", () => {
        const artists: Artist[] = [
            {
                id: "artist-1",
                slug: "artist-one",
                name: "Artist One",
                coverImageUrl: "https://example.com/artist-one.jpg",
            },
        ];

        renderWithIntl(<ArtistList artists={artists} isLoading={false} />);

        expect(screen.getByRole("img", { name: "Artist One" })).toBeInTheDocument();
        expect(screen.getByText("artist-one")).toBeInTheDocument();
    });
});
