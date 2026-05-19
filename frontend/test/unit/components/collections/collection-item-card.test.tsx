import { describe, expect, it, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, cleanup } from "../../../utils/test-utils";
import { NextIntlClientProvider } from "next-intl";
import { EntityCard } from "@/components/masonry/entity-card";
import type { EntityGridItem } from "@/types/models/collection.types";

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

const PRODUCTION_ID = "4f327f95-3a64-4fc0-8f6a-a9dc44c01111";

const messages = {
    Collections: {
        typeLabels: {
            production: "PRODUCTION",
            location: "LOCATION",
            blogpost: "BLOGPOST",
            artist: "ARTIST",
            media: "MEDIA",
        },
    },
};

const renderWithIntl = (ui: React.ReactElement) =>
    render(
        <NextIntlClientProvider locale="en" messages={messages}>
            {ui}
        </NextIntlClientProvider>
    );

const makeItem = (
    contentId: string,
    contentType: EntityGridItem["contentType"],
    overrides: Partial<EntityGridItem> = {}
): EntityGridItem => ({
    id: `item-${contentId}`,
    contentId,
    contentType,
    position: 1,
    ...overrides,
});

describe("EntityCard", () => {
    afterEach(() => cleanup());

    it("renders nothing for event content type", () => {
        const item = makeItem("event-1", "event");
        renderWithIntl(<EntityCard item={item} locale="en" />);
        expect(screen.queryByRole("heading")).not.toBeInTheDocument();
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("renders the type kicker for a production card", async () => {
        const item = makeItem(PRODUCTION_ID, "production");
        renderWithIntl(<EntityCard item={item} locale="en" />);
        expect(screen.getByText("PRODUCTION")).toBeInTheDocument();
    });

    it("renders the production title once data loads", async () => {
        const item = makeItem(PRODUCTION_ID, "production");
        renderWithIntl(<EntityCard item={item} locale="en" />);
        await screen.findByText("Production EN");
        expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Production EN");
    });

    it("links to the production detail page", async () => {
        const item = makeItem(PRODUCTION_ID, "production");
        renderWithIntl(<EntityCard item={item} locale="en" />);
        await screen.findByText("Production EN");
        const link = screen.getByRole("link");
        expect(link).toHaveAttribute("href", `/productions/${PRODUCTION_ID}`);
    });

    it("renders the image placeholder when no cover image is available", async () => {
        const item = makeItem(PRODUCTION_ID, "production");
        const { container } = renderWithIntl(<EntityCard item={item} locale="en" />);
        await screen.findByText("Production EN");
        expect(container.textContent).toContain("N\u00b01");
    });

    it("shows the curator comment when provided", () => {
        const item = makeItem(PRODUCTION_ID, "production", { comment: "Curator note here" });
        renderWithIntl(<EntityCard item={item} locale="en" />);
        expect(screen.getByText("Curator note here")).toBeInTheDocument();
    });
});
