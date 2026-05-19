import { describe, expect, it, vi } from "vitest";
import { render, screen } from "../../../utils/test-utils";

import { FeaturedSection } from "@/components/homepage/featured-section/FeaturedSection";
import * as lookupModule from "@/hooks/api/useTaxonomyLookup";
import type { Production } from "@/types/models/production.types";

vi.mock("@/hooks/api/useTaxonomyLookup");

const production: Production = {
    id: "prod-1",
    sourceId: null,
    slug: "prod-1",
    video1: null,
    video2: null,
    eticketInfo: null,
    uitdatabankTheme: null,
    uitdatabankType: "api/v1/uitdatabank/eventtype/0.50.4.0.0",
    translations: [
        {
            languageCode: "nl",
            supertitle: null,
            title: "Een voorstelling",
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
    coverImageUrl: null,
    locations: [],
    tags: [{ slug: "concert", facet: "discipline" }],
};

describe("FeaturedSection", () => {
    it("renders taxonomy tags and hides legacy uitdatabank strings", () => {
        vi.mocked(lookupModule.useTaxonomyLookup).mockReturnValue(
            new Map([
                [
                    "concert",
                    { label: "Concert", facet: "discipline", sortOrder: 1, facetSortIndex: 0 },
                ],
            ])
        );

        render(<FeaturedSection productions={[production]} locale="nl" />);

        expect(screen.getByText("Concert")).toBeInTheDocument();
        expect(screen.queryByText(/api\/v1\/uitdatabank/i)).not.toBeInTheDocument();
    });
});
