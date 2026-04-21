import { describe, expect, it, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "../../../utils/test-utils";
import { NextIntlClientProvider } from "next-intl";
import { CollectionHeader } from "@/components/collections/CollectionHeader";
import type { Collection, CollectionItem } from "@/types/models/collection.types";

const messages = {
    Collections: {
        sectionLabel: "COLLECTION",
        items: "{count, plural, one {# ITEM} other {# ITEMS}}",
    },
};

const renderWithIntl = (ui: React.ReactElement, locale = "en") =>
    render(
        <NextIntlClientProvider locale={locale} messages={messages}>
            {ui}
        </NextIntlClientProvider>
    );

const makeItem = (id: string): CollectionItem => ({
    id,
    contentId: id,
    contentType: "production",
    position: 1,
    translations: [],
    createdAt: "2026-01-01T00:00:00Z",
});

const makeCollection = (overrides: Partial<Collection> = {}): Collection => ({
    id: "col-1",
    slug: "test-collection",
    translations: [
        { languageCode: "en", title: "Test Collection", description: "A test description." },
        { languageCode: "nl", title: "Testcollectie", description: "Een testbeschrijving." },
    ],
    items: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
    coverImageUrl: null,
    ...overrides,
});

describe("CollectionHeader", () => {
    afterEach(() => cleanup());

    it("renders the localized title for the current locale", () => {
        renderWithIntl(<CollectionHeader collection={makeCollection()} />, "en");
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Test Collection");
    });

    it("renders the Dutch title when locale is nl", () => {
        renderWithIntl(<CollectionHeader collection={makeCollection()} />, "nl");
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Testcollectie");
    });

    it("falls back to the first translation when locale has no match", () => {
        const collection = makeCollection({
            translations: [{ languageCode: "nl", title: "Alleen Nederlands", description: "" }],
        });
        renderWithIntl(<CollectionHeader collection={collection} />, "en");
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Alleen Nederlands");
    });

    it("renders the section kicker", () => {
        renderWithIntl(<CollectionHeader collection={makeCollection()} />);
        expect(screen.getByText("COLLECTION")).toBeInTheDocument();
    });

    it("shows '1 ITEM' for a single item", () => {
        const collection = makeCollection({ items: [makeItem("item-1")] });
        renderWithIntl(<CollectionHeader collection={collection} />);
        expect(screen.getByText("1 ITEM")).toBeInTheDocument();
    });

    it("shows '3 ITEMS' for multiple items", () => {
        const collection = makeCollection({
            items: [makeItem("item-1"), makeItem("item-2"), makeItem("item-3")],
        });
        renderWithIntl(<CollectionHeader collection={collection} />);
        expect(screen.getByText("3 ITEMS")).toBeInTheDocument();
    });

    it("renders the description when present", () => {
        renderWithIntl(<CollectionHeader collection={makeCollection()} />);
        expect(screen.getByText("A test description.")).toBeInTheDocument();
    });

    it("omits the description when empty", () => {
        const collection = makeCollection({
            translations: [{ languageCode: "en", title: "No Desc", description: "" }],
        });
        renderWithIntl(<CollectionHeader collection={collection} />);
        expect(screen.queryByText("A test description.")).not.toBeInTheDocument();
    });

    it("renders the cover image gradient placeholder", () => {
        const { container } = renderWithIntl(<CollectionHeader collection={makeCollection()} />);
        const placeholder = container.querySelector(".bg-gradient-to-br");
        expect(placeholder).toBeInTheDocument();
    });
});
