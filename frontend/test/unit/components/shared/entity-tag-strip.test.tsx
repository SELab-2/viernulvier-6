import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "../../../../test/utils/test-utils";

import { EntityTagStrip } from "@/components/shared/entity-tag-strip";
import * as lookupModule from "@/hooks/api/useTaxonomyLookup";

vi.mock("@/hooks/api/useTaxonomyLookup");

afterEach(() => {
    cleanup();
});

beforeEach(() => {
    const map = new Map([
        ["concert", { label: "Concert", facet: "discipline", sortOrder: 1, facetSortIndex: 0 }],
        ["theatre", { label: "Theater", facet: "discipline", sortOrder: 2, facetSortIndex: 0 }],
        ["workshop", { label: "Workshop", facet: "format", sortOrder: 1, facetSortIndex: 1 }],
        ["politics", { label: "Politiek", facet: "theme", sortOrder: 1, facetSortIndex: 2 }],
        [
            "all-ages",
            { label: "Alle leeftijden", facet: "audience", sortOrder: 1, facetSortIndex: 3 },
        ],
    ]);
    vi.mocked(lookupModule.useTaxonomyLookup).mockReturnValue(map);
});

describe("EntityTagStrip", () => {
    it("renders chips with localized labels", () => {
        render(<EntityTagStrip tags={[{ slug: "concert", facet: "discipline" }]} locale="nl" />);
        expect(screen.getByText("Concert")).toBeInTheDocument();
    });

    it("orders chips by (facetSortIndex, sortOrder)", () => {
        render(
            <EntityTagStrip
                tags={[
                    { slug: "politics", facet: "theme" },
                    { slug: "concert", facet: "discipline" },
                    { slug: "workshop", facet: "format" },
                ]}
                locale="nl"
            />
        );
        const chips = screen.getAllByTestId("entity-tag-chip");
        expect(chips.map((c) => c.textContent)).toEqual(["Concert", "Workshop", "Politiek"]);
    });

    it("drops tags whose slug is not in the taxonomy", () => {
        render(
            <EntityTagStrip
                tags={[
                    { slug: "concert", facet: "discipline" },
                    { slug: "ghost-slug", facet: "discipline" },
                ]}
                locale="nl"
            />
        );
        const chips = screen.getAllByTestId("entity-tag-chip");
        expect(chips).toHaveLength(1);
        expect(chips[0]).toHaveTextContent("Concert");
    });

    it("caps chips at the cap and renders a +N indicator", () => {
        render(
            <EntityTagStrip
                tags={[
                    { slug: "concert", facet: "discipline" },
                    { slug: "theatre", facet: "discipline" },
                    { slug: "workshop", facet: "format" },
                    { slug: "politics", facet: "theme" },
                    { slug: "all-ages", facet: "audience" },
                ]}
                locale="nl"
                cap={3}
            />
        );
        expect(screen.getAllByTestId("entity-tag-chip")).toHaveLength(3);
        const overflow = screen.getByTestId("entity-tag-overflow");
        expect(overflow).toHaveTextContent("+2");
        expect(overflow).toHaveAttribute("title", expect.stringContaining("Politiek"));
        expect(overflow).toHaveAttribute("title", expect.stringContaining("Alle leeftijden"));
    });

    it("renders nothing when no tags resolve", () => {
        render(<EntityTagStrip tags={[]} locale="nl" />);
        expect(screen.queryAllByTestId("entity-tag-chip")).toHaveLength(0);
        expect(screen.queryByTestId("entity-tag-overflow")).toBeNull();
    });

    it("applies tighter padding in compact variant", () => {
        const { rerender } = render(
            <EntityTagStrip tags={[{ slug: "concert", facet: "discipline" }]} locale="nl" />
        );
        const defaultChip = screen.getByTestId("entity-tag-chip");
        expect(defaultChip.className).toContain("px-2");
        expect(defaultChip.className).toContain("py-1");

        rerender(
            <EntityTagStrip
                tags={[{ slug: "concert", facet: "discipline" }]}
                locale="nl"
                variant="compact"
            />
        );
        const compactChip = screen.getByTestId("entity-tag-chip");
        expect(compactChip.className).toContain("px-1.5");
        expect(compactChip.className).toContain("py-0.5");
    });
});
